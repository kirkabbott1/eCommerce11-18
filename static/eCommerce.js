var app = angular.module('eCommerce', ['ui.router']);

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
  $urlRouterProvider.otherwise('/');
})
//

//
app.factory('yachtFactory', function factoryFunction($http) {
  var service = {};
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
  }
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
  return service;
})

app.controller('frontpageController', function($scope, yachtFactory) {
  console.log('in front');
  yachtFactory.prods()
  .success(function(data) {
    console.log(data);
    $scope.searchresults = data
    console.log($scope.searchresults);

  })
})
app.controller('productDetailsController', function($scope, $stateParams, yachtFactory) {
  $scope.productId = $stateParams.productId;
  console.log($scope.productId);
  yachtFactory.prodId($scope.productId)
  .success(function(data) {
    $scope.prodInfo = data[0]
    console.log($scope.prodInfo)
  })
});

app.controller('signupController', function($scope, $state, yachtFactory) {
  $scope.submit = function() {
  if($scope.pass1 === $scope.pass2) {
    console.log("correct!");
    var userInfo = {
      'username': $scope.username,
      'email': $scope.email,
      'first_name': $scope.firstname,
      'last_name': $scope.lastname,
      'password': $scope.pass1

    }
    yachtFactory.signUp(userInfo)
    .success(function() {
      $state.go('login')
    })

  }
  else{
    $scope.doesntMatch = true;
  }
}
});

app.controller('loginController', function($scope, $state, yachtFactory) {
$scope.submitEnterSite = function(){
  var loginInfo = {
    'username': $scope.username,
    'password': $scope.pass1
  }
  console.log(loginInfo)
  yachtFactory.login(loginInfo)
  .success(function() {
    $state.go('frontpage')
  })
}
})
