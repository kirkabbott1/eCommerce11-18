from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv())

from flask import Flask, jsonify, request, render_template, session, flash, redirect
import pg, os
import bcrypt
import uuid
import stripe
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

app = Flask('ECommerce', static_url_path='')
db = pg.DB(
    dbname=os.environ.get('PG_DBNAME'),
    host=os.environ.get('PG_HOST'),
    user=os.environ.get('PG_USERNAME'),
    passwd=os.environ.get('PG_PASSWORD')
)

tmp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
app = Flask('Ecommerce', static_url_path='', template_folder=tmp_dir)

# For testing purposes
@app.route('/')
def home():
    # return render_template('index.html')
    return app.send_static_file('index.html')


# Returns all products
@app.route('/api/products')
def products():
    products = db.query('select * from product').dictresult()
    return jsonify(products)

# Returns a single product
@app.route('/api/product/<productId>')
def product(productId):
    prod_id = db.query('select * from product where id = $1', productId).dictresult()
    return jsonify(prod_id)

# Allows a customer to sign up for the site
@app.route('/api/customer/signup', methods=['POST'])
def signUp():
    # Get data from sign up form on front-end (in JSON format)
    custEntry = request.get_json()
    entered_password = custEntry['password']
    entered_password2 = custEntry['password2']
    if entered_password == entered_password2:
        # Encrypt the password entered by the user
        salt = bcrypt.gensalt()
        encrypted_password = bcrypt.hashpw(entered_password.encode('utf-8'), salt)
        # Store the user information as a new entry (with the encrypted_password)
        result = db.insert('customer', username=custEntry['username'], email=custEntry['email'], password=encrypted_password, first_name=custEntry['first_name'], last_name=custEntry['last_name'])
        # Returns the user entered information
        return jsonify(result)
    else:
        # If passwords don't match
        return 'login failed', 401

# Allows a user to login to the site
@app.route('/api/user/login', methods=['POST'])
def login():
    # Get data from a login form on front-end (in JSON format)
    custEntry = request.get_json()
    # Queries the customer database for an entry that matches the customer's username
    customer = db.query('select * from customer where username = $1', custEntry["username"]).dictresult()[0]
    # Grabs the existing encrytped password for the matching user entry
    encrypted_password = customer['password']
    # Grabs the password entered by the user on the login form
    entered_password = custEntry['password']
    # Encrypts the password entered by the user
    rehash = bcrypt.hashpw(entered_password.encode('utf-8'), encrypted_password)
    # Checks to see if the existing stored encrypted password matches encrypted version of the one entered by the user at login
    if rehash == encrypted_password:
        #If passwords match:
        # Create auth token
        token = uuid.uuid4()
        # Store created auth token in database
        db.insert('auth_token', token=token, customer_id=customer['id'])
        # Creates object of user information and the new auth token to return
        loggedin = {"user": {'username': customer['username'], 'email': customer['email'], 'first_name': customer['first_name'], 'last_name': customer['last_name']}, 'authtoken': token}
        #Retuns user info and auth token in JSON format
        return jsonify(loggedin)
    else:
        # If passwords don't match
        return 'login failed', 401


###### The following routes are available to authenticated users (users with a valid auth token only)

# Adds a product to an authenticated user's shopping cart
@app.route('/api/shopping_cart', methods=['POST'])
def shopping_cart():
    # Validates auth_token
    auth_token = request.get_json().get('auth_token')

    check_token = db.query('select * from auth_token where token = $1', auth_token).namedresult()
    # check if authenticated user
    if len(check_token) > 0:
        # check if customer is adding or deleting item
        add_or_delete = request.get_json().get('add_or_delete')
        customer = db.query('select customer_id from auth_token where token = $1', auth_token).namedresult()[0]
        prod_id = request.get_json().get('product_id')

        if (add_or_delete == 'add'):
            # if adding, make a query and insert item into db
            #stores product in the shopping cart table linked to the authenticated user's id
            db.insert('product_in_shopping_cart', product_id=prod_id, customer_id=customer.customer_id)

            return 'Product Added to Cart', 200
        elif (add_or_delete == 'delete'):
            # if deleting, delete item from db
            deleteItem = db.query('select id from product_in_shopping_cart where product_id = $1 and customer_id = $2', (prod_id, customer.customer_id))
            deleteItem = deleteItem.namedresult()[0].id
            deleteItem = int(deleteItem)

            db.delete('product_in_shopping_cart',
                {
                    'id': deleteItem
                }
            )
            return "Item deleted!!!!!!"
    else:
        # If not authenticated user
        return 'Not authorized', 403


@app.route('/api/shopping_cart', methods=['GET'])
def get_shop():
    # Validates auth_token
    auth_token = request.args.get('auth_token')
    check_token = db.query('select * from auth_token where token = $1', auth_token).namedresult()
    if len(check_token) > 0:
        # If authenticated user
        customer = db.query('select customer_id from auth_token where token = $1', auth_token).namedresult()[0]
        # Queries all products in the user's shopping cart
        current_cart = db.query('select product.id as prodId, product.name as prodName, product.price as prodPrice, product.description as prodDescription, product.image_path as prodImg from product_in_shopping_cart, product where product_in_shopping_cart.product_id = product.id and customer_id =$1', customer.customer_id).dictresult()
        # Returns results in JSON format
        return jsonify(current_cart)
    else:
        # If not authenticated user
        return 'Not authorized', 403

@app.route('/api/shopping_cart/checkout', methods=['POST'])
def checkout():
    #Validates auth_token
    auth_token = request.get_json().get('auth_token')
    address = request.get_json().get('address')
    stripe_token = request.get_json().get('stripe_token')
    print address
    street_address = address['street_address']
    city = address['city']
    state = address['state']
    zipcode = address['zipcode']
    check_token = db.query('select * from auth_token where token = $1', auth_token).namedresult()
    if len(check_token) > 0:
        # If authenticated user
        customer = db.query('select customer_id from auth_token where token = $1', auth_token).namedresult()[0]
        # Queries all products in the user's shopping cart
        current_cart = db.query('select product.id as prod_id from product_in_shopping_cart, product where product_in_shopping_cart.product_id = product.id and customer_id =$1', customer.customer_id).dictresult()

        #Queries all products in the user's shopping cart and adds their prices for a total price of the current cart
        total = db.query('select sum(product.price) as total from product_in_shopping_cart, product where product_in_shopping_cart.product_id = product.id and customer_id =$1', customer.customer_id).namedresult()[0]

        stripe.Charge.create(
          amount=total.total * 100,
          currency="usd",
          source= stripe_token['id'], # obtained with Stripe.js
          description="Charge for " + stripe_token['email']
        )

        # Creates a purchase record for the authenticated user and the total price of all the items in their current cart
        db.insert('purchase', customer_id=customer.customer_id, total_price=total.total,
        street_address=street_address,
        city=city,
        state=state,
        zipcode=zipcode)

        # Queries the purchase id of the record inserted in the previous step
        purchase_id = db.query('select id from purchase order by id desc limit 1').namedresult()[0].id
        # For each product being purchased (each product that is in the current_cart):
        for product in current_cart:
            # Add that product to the table of items purchased by each user and include the purchase id number
            db.insert('product_in_purchase', purchase_id=purchase_id, product_id=product['prod_id']
            )
        # Deletes all products from user's shopping cart in conclude the purchase
        result = db.query('delete from product_in_shopping_cart where customer_id= $1', customer.customer_id)
        # Returns the number of items deleted from shopping_cart (purchased)
        return jsonify(result), 200
    else:
        # If not authenticated user
        return 'Not authorized', 403
##############################################

if __name__ == '__main__':
    app.run(debug=True)
