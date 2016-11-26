var app = angular.module('eCommerce', ['ui.router', 'ngCookies']);

app.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider

  .state({
    name: 'frontpage',
    url: '/',
    templateUrl: 'frontpage.html',
    controller: 'frontpageController'
  })
  .state({
    name: 'productDetails',
    url: '/product/{productId}',
    templateUrl: 'productDetails.html',
    controller: 'productDetailsController'
  })
  .state({
    name: 'signup',
    url: '/signup',
    templateUrl: 'signup.html',
    controller: 'signupController'
  })
  .state({
    name: 'login',
    url: '/user/login',
    templateUrl: 'login.html',
    controller: 'loginController'
  })
  .state({
    name: 'shoppingCart',
    url: '/user/shoppingcart',
    templateUrl: 'shoppingcart.html',
    controller: 'shoppingCartController'
  })
  .state({
    name: 'checkout',
    url: '/user/shoppingcart/checkout',
    params: {
      sum: null
    },
    templateUrl: 'checkoutpage.html',
    controller: 'checkOutController'
  })
  $urlRouterProvider.otherwise('/');
})
//

//
app.factory('yachtFactory', function factoryFunction($http, $rootScope, $cookies) {
  var service = {};
  var userInfo = {};

  $rootScope.factoryCookieData = null;

  // COOKIE DATA GETS PASSES INTO THE factory
  $rootScope.factoryCookieData = $cookies.getObject('userData');

  // check if user is logged in
  if ($rootScope.factoryCookieData) {
    console.log("PAGE HAS BEEN RELOADED!!!");
    console.log('COOKIE DATA:', $rootScope.factoryCookieData);
    $rootScope.user_info = $rootScope.factoryCookieData.user;
    $rootScope.auth_token = $rootScope.factoryCookieData.authtoken;
  }

  $rootScope.logout = function(){
    console.log('ROOT USERNAME BEFORE:', $rootScope.user_info);
    console.log('ROOT USER TOKEN BEFORE:', $rootScope.auth_token);
    // reset scope variables
    $rootScope.factoryCookieData = null;
    $cookies.remove('userData');
    $rootScope.user_info = '';
    $rootScope.auth_token = null;
    console.log('ROOT USERNAME AFTER:', $rootScope.user_info);
    console.log('ROOT USER TOKEN AFTER:', $rootScope.auth_token);
  };
  service.storeUserInfo = function(data) {
    userInfo.authtoken = data.token;
  };
  service.getUserInfo = function() {
    return userInfo;
  };
  service.prods = function() {
    return $http ({
      method: 'GET',
      url: '/api/products'
      });
  };
  service.prodId = function(id) {
    return $http ({
      method: 'GET',
      url: '/api/product/' + id
    });
  };
  service.signUp = function(userdata) {
    return $http ({
      method: 'POST',
      url: '/api/customer/signup',
      data: userdata
    });
  }
  service.login = function(userdata) {
    return $http ({
      method: 'POST',
      url: '/api/user/login',
      data: userdata
    })
  }
  service.addToCart = function(auth_token, product_id) {
    var add_or_delete = 'add';

    return $http ({
      method: 'POST',
      url: '/api/shopping_cart',
      data: {
        auth_token: auth_token,
        product_id: product_id,
        add_or_delete: add_or_delete
      }
    });
  }
  service.removeFromCart = function(auth_token, product_id) {
    var add_or_delete = 'delete';
    return $http ({
      method: 'POST',
      url: '/api/shopping_cart',
      data: {
        auth_token: auth_token,
        product_id: product_id,
        add_or_delete: add_or_delete
      }
    })
  }
  service.Cart = function(){
    console.log('ROOTSCOPE AUTH TOKEN FROM CART SERVICE:', $rootScope.auth_token);
    return $http ({
      method: 'GET',
      url: '/api/shopping_cart',
      params: {
        auth_token: $rootScope.auth_token
      }
    })
  }
  service.Checkout = function(auth_token, address, stripeToken) {
    return $http ({
      method: 'POST',
      url: '/api/shopping_cart/checkout',
      data: {
        auth_token: auth_token,
        address: address,
        stripe_token: stripeToken
      }
    });
  };
  return service;
});

app.controller('frontpageController', function($scope, yachtFactory) {
  console.log('in front');
  yachtFactory.prods()
  .success(function(data) {
    console.log(data);
    $scope.searchresults = data
    console.log($scope.searchresults);
  })
})
app.controller('productDetailsController', function($scope, $stateParams, yachtFactory, $rootScope, $state) {
  $scope.productId = $stateParams.productId;
  console.log($stateParams);
  yachtFactory.prodId($scope.productId)
  .success(function(data) {
    $scope.prodInfo = data[0]
    console.log($scope.prodInfo)
  })
  $scope.detailAddCart = function() {
    yachtFactory.addToCart($rootScope.auth_token, $scope.productId)
    console.log($rootScope.auth_token)
    console.log($scope.productId)
    $state.go('frontpage')
    }
});
app.controller('shoppingCartController', function($scope, $stateParams, yachtFactory, $rootScope, $state) {
  $scope.removefromcart = function(prodId) {
    console.log("PRODUCT ID", prodId);
    yachtFactory.removeFromCart($rootScope.auth_token, prodId)
      .success(function() {
        // reload the page
        $state.reload();
      });
  }
  yachtFactory.Cart()
  .success(function(data) {
    $scope.shoppingCartData = data;
    console.log("SHOPPING CART PRODUCT OBJ:", $scope.shoppingCartData);

    var sum = 0;
    for(var i=0; i<data.length; i++) {
    sum += $scope.shoppingCartData[i].prodprice
  }
    $scope.sum = sum;
    $scope.checkout = function() {
      $state.go('checkout', {sum: $scope.sum})
    }
  });
});
app.controller('checkOutController', function($scope, $stateParams, yachtFactory, $rootScope, $state) {
  $scope.sum = $stateParams.sum;
  console.log("sum has been passed to checkout", $scope.sum);

  $scope.checkedOut = function(){
    var Address = {
      'street_address': $scope.street_address,
      'city': $scope.city,
      'state': $scope.state,
      'zipcode': $scope.zipcode
    }
    var handler = StripeCheckout.configure({
      // publishable key
      key: 'pk_test_fsHKzAC0RpPxgo15k7WfFzRV',
      locale: 'auto',
      token: function callback(token) {
        var stripeToken = token.id;
        console.log("STRIPE TOKEN", token)
        // Make checkout API call here and send the stripe token
        // to the back end
        yachtFactory.Checkout($rootScope.auth_token, Address, token)
        .success(function() {
          console.log("address info entered");

        }).error(function(data) {
            console.log(Address)
        })
      }
    });
    // this actually opens the popup modal dialog
    handler.open({
      name: 'Yachts',
      description: 'yachts',
      amount: $scope.sum * 100
    });
  // yachtFactory.Checkout($rootScope.userToken, Address)
  // .success(function() {
  //   console.log("address info entered");
  //
  // }).error(function(data) {
  //     console.log(Address)
  // })

  };
});

app.controller('signupController', function($scope, $state, yachtFactory) {
  $scope.submit = function() {

    console.log("correct!");
    var userInfo = {
      'username': $scope.username,
      'email': $scope.email,
      'first_name': $scope.firstname,
      'last_name': $scope.lastname,
      'password': $scope.pass1,
      'password2': $scope.pass2

    }
    yachtFactory.signUp(userInfo)
    .success(function() {
      $state.go('login')
    }).error(function(data) {
      console.log("failed")
        $scope.doesntMatch = true;
    });


    // .error() {
    //
    // }
    // $scope.doesntMatch = true;

  }
});

app.controller('loginController', function($scope, $state, yachtFactory, $cookies, $rootScope) {
  $scope.submitEnterSite = function(){
    var loginInfo = {
      'username': $scope.username,
      'password': $scope.pass1
    }

    console.log($scope.username)
    yachtFactory.login(loginInfo)
    .error(function(data) {
      $scope.failed = true;
    })
    .success(function(data) {
      console.log(data);
      // store userData into a cookie
      $cookies.putObject('userData', data)
      // $cookies.put('token', data.authtoken)
      // $cookies.put('username', data.user.username)
      // create user_info and auth_token rootscope variables
      $rootScope.user_info = data['user'];
      $rootScope.auth_token = data['authtoken'];
      console.log('user logged in and created user info:', $rootScope.user_info);
      console.log("user logged in and created a token:", $rootScope.auth_token);
      // console.log(loginInfo.password);
      $state.go('frontpage');
    });
  }
});
