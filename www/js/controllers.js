angular.module('collocationdominoes.controllers', [])
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  //$scope.$on('$ionicView.enter', function(e) {
  //});

.controller('BackButtonController', function($scope, $ionicHistory, $stateParams, $filter,
  Data, StateData, SummaryData, Ids){
  $scope.customGoBack = function(){

    $ionicHistory.goBack();
    var currentState = $ionicHistory.currentStateName();

    if(currentState != "exercise"){
      return;
    }

    var exerciseId = $stateParams.exerciseId;
    var name = $stateParams.collectionName;
    var collId = Ids.getCollId(name);
    var exId = Ids.getExId(collId,exerciseId);
    var words = Data.getWords(collId,exId);

    //update end time
    if(StateData.getSingleState(collId,exId) != "Complete"){
      var time = new Date();
      var timeNow = $filter('date')(time,'medium');
      SummaryData.updateEndTime(collId,exId,timeNow);
    }

    if(SummaryData.getSummary(collId,exId).score == words.length){
      StateData.updateState(collId,exId,"Complete");
    }
    else{
      StateData.updateState(collId,exId,"Incomplete");
    }
  }
})

.controller('CollectionsCtrl', function($scope, $timeout, $ionicLoading, $state, $ionicPopover, $ionicPopup, Data, 
  $cordovaNetwork, $rootScope, Ids, ionicToast){
  $scope.title = Data.getTitle();
  $scope.collections = [];

  var getData = function(isRefreshing){
    $rootScope.show();
    Data.getAllColls(isRefreshing).then(function(response){
      if(response && response.status == 404){
        ionicToast.show(Data.get404Msg(),'middle',true);
        return;
      }
      $scope.collections = response;
      return response;
    }).then(function(res){
      $rootScope.hide();
    });
  }

  if($rootScope.online){
    getData(false);
  }
  else{
    ionicToast.show(Data.getErrorMsg(),'middle',false,2500);
  }

  $scope.doRefresh = function(){
    if($rootScope.online){
      getData(true);
    }
    else{
      ionicToast.show(Data.getErrorMsg(),'middle',false,2500);
    }
    $scope.$broadcast('scroll.refreshComplete'); 
  };

  $ionicPopover.fromTemplateUrl("templates/collections-popover.html",{
    scope: $scope
  }).then(function(popover){
    $scope.popover = popover;
  });

  $scope.openPopover = function($event){
    $scope.popover.show($event);
  };

  $scope.showAbout = function(){
    var alertPopup = $ionicPopup.alert({
      scope: $scope,
      title: 'About Flax',
      templateUrl: 'templates/aboutFlax.html'
    });

    alertPopup.then(function(response){
      //custom functionality
    });
  }

  $scope.showHelp = function(){
    var alertPopup = $ionicPopup.alert({
      scope: $scope,
      title: 'How to Play',
      templateUrl: 'templates/howToPlay.html'
    });

    alertPopup.then(function(response){
      //custom functionality
    });
  }
})

.controller('ExsCtrl', function($scope, $timeout, $stateParams, $ionicPopup, $ionicPopover, $rootScope,
  Ids, StateData, SummaryData, Data, ionicToast,$ionicLoading,$ionicListDelegate,DragData) {
  
  var name = $stateParams.collectionName;
  $scope.collectionName = name;

  var collId = Ids.getCollId($scope.collectionName);
  DragData.createColl(collId);

  var desc = Data.getDesc();
  desc.forEach(function(val){
    if(val.key == name){
      $scope.collDesc = val.desc;
      $scope.collName = val.name;
    }
  });

  if(!$scope.collDesc){
    $scope.collDesc = "n/a";
    $scope.collName = "n/a";
  }

  //create new data for this collection
  if(!StateData.isCreated(collId)){
    StateData.createColl(collId);
  }
  if(!SummaryData.isCreated(collId)){
    SummaryData.createColl(collId);
  }

  var getData = function(collId,isRefreshing){
    $rootScope.show();
    Data.getAllEx(collId,isRefreshing).then(function(response){
      if(response.status && response.status == 404){
        ionicToast.show(Data.get404Msg(),'middle',true);
        return;
      }
      $scope.exercises = response;
      for(var i=0;i<$scope.exercises.length;i++){
        var exerciseId = $scope.exercises[i]._id;
        var exId = Ids.getExId(collId,exerciseId);
        var currentState = StateData.getSingleState(collId,exId);
        if(currentState){
          StateData.updateState(collId,exId,currentState);
        }
        else{
          StateData.updateState(collId,exId,"New");
        }
      }
      $scope.states = StateData.getAllStates(collId);
    }).then(function(){
      $rootScope.hide();
    });
  }

  //fetch the data
  getData(collId,false);

  $scope.doRefresh = function(){
    if($rootScope.online){
      getData(collId,true); 
    }
    else{
      ionicToast.show(Data.getErrorMsg(),'middle');
    }
    $scope.$broadcast('scroll.refreshComplete'); 
  };

  $scope.getId = function(exerciseId){
    return Ids.getExId(collId,exerciseId);
  }

  $scope.doRestart = function(ex){
    var exId = Ids.getExId(collId,ex);

    SummaryData.clearSummary(collId,exId);
    StateData.updateState(collId,exId,"New");
    $ionicListDelegate.closeOptionButtons();

    var words = Data.getWords(collId,exId);
    for(var i=0;i<words.length;i++){
      var word = words[i];
      word.val_left = "";
      word.val_right = "";
    }
    words[0].val_left = words[0].left;
    words[words.length-1].val_right = words[words.length-1].right;
    DragData.clear(collId,exId);
  }

  //use this method to refresh data
  $scope.$on('$ionicView.enter',function(e){
    $scope.states = StateData.getAllStates(collId);//refresh states
  });

  $ionicPopover.fromTemplateUrl("templates/exercises-popover.html",{
    scope: $scope
  }).then(function(popover){
    $scope.popover = popover;
  });

  $scope.openPopover = function($event){
    $scope.popover.show($event);
  };

  $scope.showAbout = function(){
    var alertPopup = $ionicPopup.alert({
      scope: $scope,
      title: 'About '+name,
      templateUrl: 'templates/aboutCollection.html'
    });

    alertPopup.then(function(response){
      //custom functionality
    });
  }

  $scope.showHelp = function(){
    var alertPopup = $ionicPopup.alert({
      scope: $scope,
      title: 'How to Play',
      templateUrl: 'templates/howToPlay.html'
    });

    alertPopup.then(function(response){
      //custom functionality
    });
  }
})

.controller('ExerciseCtrl', function($scope, $stateParams, $ionicLoading, $ionicPopup, $ionicPopover,$filter, $timeout,
  ionicToast, Ids, SummaryData, Data, $rootScope, DragData, StateData) {
  $scope.hide = false;

  $rootScope.show();
  var exerciseId = $stateParams.exerciseId;
  var collectionName = $stateParams.collectionName;
  var collId = Ids.getCollId(collectionName);

  //exIds already created in 'ExsCtrl'
  var exId = Ids.getExId(collId,exerciseId);
  if(!SummaryData.getSummary(collId,exId)){
    SummaryData.createSummary(collId,exId);
    var time = new Date();
    var timeNow = $filter('date')(time,'medium');//angularjs date format
    SummaryData.updateStartTime(collId,exId,timeNow);
  }

  if(StateData.getSingleState(collId,exId) == "Complete"){
    $scope.hide = true;
  }

  //Fisher-Yates shuffle
  var shuffle = function(array) {
    var m = array.length, t, i;

    // While there remain elements to shuffle
    while (m) {

      // Pick a remaining element
      i = Math.floor(Math.random() * m--);

      // And swap it with the current element
      t = array[m];
      array[m] = array[i];
      array[i] = t;
    }
    return array;
  }

  $scope.summary = SummaryData.getSummary(collId,exId);
  $scope.drags = [];

  Data.getSingleEx(collId,exId).then(function(response){
    if(response.status == 404){
      ionicToast.show(Data.get404Msg(),'middle',true);
      return;
    }
    $scope.words = response;
    if($scope.words.length == 0){//critical check
      return;
    }
    $scope.words[0].val_left = $scope.words[0].left;
    $scope.words[$scope.words.length-1].val_right = $scope.words[$scope.words.length-1].right;

    DragData.createDrags(collId,exId);
    $scope.drags = shuffle(DragData.getDrags(collId,exId));

  }).then(function(){//use of keyword 'finally' creates problems here
    $rootScope.hide();
  });

  $scope.title = Data.getExTitle(collId,$stateParams.exerciseId);

  $scope.isActive = function(index,place){
    if(place == "right"){
      if(index == $scope.words.length-1){
        return false;
      }
      if($scope.words[index+1].isCorrect){
        return false;
      }
    }
    if(place == "left"){
      if(index == 0){
        return false;
      }
      if($scope.words[index-1].isCorrect){
        return false;
      }
    }
    return true;
  }

  $scope.return = function(wordId,place){
    var data;
    // var index = $scope.words.findIndex(x => x.id == wordId);
    var index = -1;
    for(var i=0;i<$scope.words.length;i++){
      if($scope.words[i].id == wordId){
        index = i;
      }
    }
    if(place == "left"){
      if(index == 0){return;}
      if($scope.words[index].isCorrect || $scope.words[index-1].isCorrect){return;}
      data = $scope.words[index].val_left;
      if(data == ""){return;}
      $scope.words[index].val_left = "";
      $scope.words[index-1].val_right = "";
    }
    else{
      if(index == $scope.words.length-1){return;}
      if($scope.words[index].isCorrect || $scope.words[index+1].isCorrect){return;}
      data = $scope.words[index].val_right;
      if(data == ""){return;}
      $scope.words[index].val_right = "";
      $scope.words[index+1].val_left = "";
    }
    // var dragIndex = $scope.drags.findIndex(x => x.word == data);
    var dragIndex = -1;
    for(var i=0;i<$scope.drags.length;i++){
      if($scope.drags[i].word == data){
        dragIndex = i;
      }
    }
    if(dragIndex != -1){
      $scope.drags[dragIndex].isDraggable = true;
    }
  }

  $scope.checkAnswer = function(){
    if(!checkAll()){
      ionicToast.show('Answer Incorrect!','middle',false,2500);
    }
  }

  checkAll = function(){
    var correct_words = 0;
    for(var i=0; i<$scope.words.length;i++){
      var word = $scope.words[i];
      SummaryData.createSummary(collId,exId);
      if(word.isCorrect){
        correct_words++;
      }
    }
    SummaryData.updateScore(collId,exId,correct_words);
    if($scope.words.length == correct_words){
      $scope.hide = true;
      ionicToast.show('Well done!','bottom',false,2000);
    }
    else{
      $scope.hide = false;
    }
    return $scope.hide;
  }

  $scope.onDragSuccess = function(data,evt,index){
    $scope.drags[index].isDraggable = false;
  }
  $scope.onDropComplete = function(data,evt,wordId,place){
    var done = null;
    for(var i=0;i<$scope.words.length;i++){
      var word = $scope.words[i];
      if(word.id == wordId){
        if(place == "left"){
          var value = $scope.words[i].val_left;
          $scope.words[i].val_left = data;
          $scope.words[i-1].val_right = data;
          done = value;
        }
        else{
          var value = $scope.words[i].val_right;
          $scope.words[i].val_right = data;
          $scope.words[i+1].val_left = data;
          done = value;
        }
      }
    }
    if(done){
      for(var i=0;i<$scope.drags.length;i++){
        if($scope.drags[i].word == done){
          $scope.drags[i].isDraggable = true;
        }
      }
    }
    checkAll();
  }

  $ionicPopover.fromTemplateUrl("templates/ex-detail-popover.html",{
    scope: $scope
  }).then(function(popover){
    $scope.popover = popover;
  });

  $scope.openPopover = function($event){
    $scope.popover.show($event);
  }

  $scope.showSummary = function(){
    var alertPopup = $ionicPopup.alert({
      scope: $scope,
      title: 'Summary report',
      templateUrl: 'templates/summary.html'
    });
  }

  $scope.restartGame = function(){
    var confirmPopup = $ionicPopup.confirm({
      title: 'Restart this Game!',
      template: 'Would you like to restart this game?'
    });

    confirmPopup.then(function(response){
      if(response){
        //clear model
        SummaryData.clearSummary(collId,exId);
        SummaryData.createSummary(collId,exId);
        $scope.hide = false;

        var time = new Date();
        var timeNow = $filter('date')(time,'medium');//angularjs date format
        SummaryData.updateStartTime(collId,exId,timeNow);

        //clear view
        for(var i=0;i<$scope.words.length;i++){
          var word = $scope.words[i];
          word.val_left = "";
          word.val_right = "";
        }
        $scope.words[0].val_left = $scope.words[0].left;
        $scope.words[$scope.words.length-1].val_right = $scope.words[$scope.words.length-1].right;
        for(var i=0;i<$scope.drags.length;i++){
          $scope.drags[i].isDraggable = true;
        }

        //update summary
        $scope.summary = SummaryData.getSummary(collId,exId);
      }
      else{
        // console.log("no");
      }
    });
  }
});
