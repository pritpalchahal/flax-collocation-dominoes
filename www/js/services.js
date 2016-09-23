angular.module('collocationdominoes.services', [])

.factory('Data', function ($http, $cordovaNetwork, ionicToast, Ids, $rootScope, $q) {
  const THIS_ACTIVITY = "CollocationDominoes";//name of this Activity
  const NICE_TITLE = "Collocation Dominoes";//for displaying only

  const ALL_COLLECTIONS_URL = "http://collections.flax.nzdl.org/greenstone3/flax?a=fp&sa=library&o=xml";

  const PREFIX_URL = "http://collections.flax.nzdl.org/greenstone3/flax";
  const TEMPLATE_URL = "?a=pr&o=xml&ro=1&rt=r&s=SSSS&c=CCCC&s1.service=11";

  //to get url replace CCCC with collection name (e.g. collocations) & SSSS with activity name (e.g. CollocationMatching)
  const TEMPLATE_URL_WITH_ACTIVITY = TEMPLATE_URL.replace("SSSS",THIS_ACTIVITY);

  const SERVICE_NUMBER = 100;
  const TEMPLATE_COLLNAME = "&s1.collname=CCCC";

  var collections = [];//list of possible collections for this activity
  var descriptions = [];//list of name,description for each collection

  var exercises = [];//list of possible exercises for this activity

  var words = [];
  var draggables = [];

  var getAll = function(isRefreshing){
    if(collections.length > 0 && !isRefreshing){
      return new Promise(function(resolve){
        return resolve(temp_collections);
      });
    }
    var temp_collections = [];
    var promise = $http.get(ALL_COLLECTIONS_URL).then(function(response){
      var x2js = new X2JS();
      var jsonData = x2js.xml_str2json(response.data);
      var collectionList = jsonData.page.pageResponse.collectionList.collection;
      for(var i=0; i<collectionList.length;i++){
        var serviceList = collectionList[i].serviceList.service;
        var metadataList = collectionList[i].metadataList.metadata;
        // console.log(metadataList);
        for(var j=0 ; j<metadataList.length; j++){
          var obj = metadataList[j];
          for(var k=0;k<serviceList.length;k++){
            var sObj = serviceList[k];
            if(obj._name == "flaxmobile" && obj.__text == "true" && sObj._name == THIS_ACTIVITY){
              var coll = collectionList[i];
              var name = coll._name;
              temp_collections.push(name);
              var d = coll.displayItem[0].__text;
              if(!d){
                d = "";
                var arr = coll.displayItem[0].p;
                arr.forEach(function(val){
                  d += val;
                });
              }
              var n = coll.displayItem[1].__text;
              var obj = {key:name,name:n,desc:d};
              descriptions.push(obj);
            }
          }
        }
      }
      return temp_collections;
    },function(error){
      return error;
    });
    return promise;
  }

  var getAllColls = function(isRefreshing){
    collections = [];
    promises = [];

    return getAll(isRefreshing).then(function(response){
      response.forEach(function(collectionName){
        promises.push(isEmpty(collectionName));
      });
      return $q.all(promises).then(function(values) {
        values.forEach(function(value){
          if(value){
            collections.push(value);
          }
        });
        return collections;
      });
    });
  }

  var isEmpty = function(collectionName){
    var suffix_url = TEMPLATE_URL_WITH_ACTIVITY.replace("CCCC",collectionName);
    var coll_url = PREFIX_URL + suffix_url;

    return $http.get(coll_url).then(function(res){
      var x2js = new X2JS();
      var data = x2js.xml_str2json(res.data);
      if(!data || !data.response){return;}
      var collection_name = data.response._from;

      //only "password" has more than one category
      var ex = data.response.categoryList.category;
      if(ex.length > 0 || ex.exercise){
        return collection_name;
      }
    });
  }

  var getAllEx = function(collId,isRefreshing){
    if(exercises[collId] && !isRefreshing){
      return new Promise(function(resolve){
        return resolve(exercises[collId]);
      });
    }
    if(!$rootScope.online){
      ionicToast.show(getErrorMsg(),'middle',false,3000);
      return new Promise(function(resolve){
        return resolve([]);
      });
    }
    if(!isRefreshing){
      //initiate all sub arrays
      exercises[collId] = [];
      words[collId] = [];
      draggables[collId] = [];
    }

    var collectionName = Ids.getCollName(collId);
    var suffix_url = TEMPLATE_URL_WITH_ACTIVITY.replace("CCCC",collectionName);
    var coll_url = PREFIX_URL + suffix_url;

    return $http.get(coll_url).then(function(response){
      var x2js = new X2JS();
      var jsonData = x2js.xml_str2json(response.data);
      // if(!jsonData.response){return;}
      var category = jsonData.response.categoryList.category;
      if(category.length > 0){
        for(var i=0; i<category.length; i++){
          var array = category[i].exercise;
          if(array){//check if array is defined or not
            if(array.length > 0){
              exercises[collId] = [].concat(array);
            }
            else{
              exercises[collId].push(array);
            }
          }
        }
      }
      else{
        exercises[collId] = [].concat(jsonData.response.categoryList.category.exercise);
      }
      return exercises[collId];
    },function(error){
      return error;
    });
  }

  getSingleEx = function(collId,exId){
    if(words[collId][exId]){
      return new Promise(function(resolve){
        return resolve(words[collId][exId]);
      });
    }
    if(!$rootScope.online){
      ionicToast.show(getErrorMsg(),'middle',false,3000);
      return new Promise(function(resolve){
        return resolve([]);
      });
    }
    //initiate
    words[collId][exId] = [];
    draggables[collId][exId] = [];

    var exerciseId = Ids.getExerciseId(collId,exId);
    var collectionName = Ids.getCollName(collId);

    var temp_url = TEMPLATE_URL_WITH_ACTIVITY.replace("CCCC",collectionName);
    var collname_url= TEMPLATE_COLLNAME.replace("CCCC",collectionName);
    var middle_url = temp_url.replace("11",SERVICE_NUMBER) + collname_url;

    var temp_words = [];

    for(var i= 0 ; i<exercises[collId].length; i++){
      if(exercises[collId][i]._id == parseInt(exerciseId)){
        var contained_url = exercises[collId][i].url;
        var params_url = contained_url.substr(contained_url.indexOf("&s1.params"));
        var final_url = PREFIX_URL + middle_url + params_url;

        return $http.get(final_url).then(function(response){
          var x2js = new X2JS();
          var jsonData = x2js.xml_str2json(response.data);
          temp_words = jsonData.response.player.word;
          var uniqueId = 0;
          for(var j=0; j<temp_words.length; j++){
            var collo = temp_words[j].collo;
            var text = collo.__text;
            var left = getLeft(text);
            var right = getRight(text);
            var center = getCenter(text);
            var obj = {"left":left,"right":right,"center":center,"id":uniqueId,"val_left":"","val_right":"",
              get isCorrect(){return (this.right == this.val_right) && (this.left == this.val_left);}};
            uniqueId++;
            words[collId][exId].push(obj);
          };
          return words[collId][exId];
        },function(error){
          return error;
        });
      }
    }
  }

  getExTitle = function(collId,exId){
    for(var i= 0 ; i<exercises[collId].length; i++){
      if(exercises[collId][i]._id == parseInt(exId)){
        return exercises[collId][i]._name;
      }
    }
    return null;
  }

  restartEx = function(collId,ex){
    exercises[collId][exercises.indexOf(ex)] = [];
  }

  var getWords = function(collId,exId){
    if(words[collId][exId]){
      return words[collId][exId];
    }
    return null;
  }

  var getDesc = function(){
    return descriptions;
  }

  var getLeft = function(word){
    var result = word.split(" ");
    return result[0];
  }

  var getRight = function(word){
    var result = word.split(" ");
    return result[result.length-1];
  }

  var getCenter = function(word){
    var result = word.split(" ");
    if(result.length > 2){
      var center = "";
      for(var i=1;i<result.length-1;i++){
        center += result[i];
      }
      return center;
    }
    return "";
  }

  var getErrorMsg = function(){
    return "No Internet connection available!";
  }

  var get404Msg = function(msg){
    return "Error at server, try again later! " + (msg ? msg : "");
  }

  var getTitle = function(){
    return NICE_TITLE;
  }

  return {
    getWords: getWords,
    getAllColls: getAllColls,
    getDesc: getDesc,

    getAllEx: getAllEx,
    getSingleEx: getSingleEx,

    getExTitle: getExTitle,
    restartEx: restartEx,

    getErrorMsg: getErrorMsg,
    get404Msg: get404Msg,
    getTitle: getTitle
  };
})

.factory('SummaryData', function () {
  var summary = [];

  var updateStartTime = function(collId,exId,s){
    summary[collId][exId].sTime = s;
  }

  var updateEndTime = function(collId,exId,e){
    summary[collId][exId].eTime = e;
  }

  var updateScore = function(collId,exId,score){
    if(summary[collId][exId]){
      summary[collId][exId].score = score;
    }
  }

  var createSummary = function(collId,exId){
    if(!summary[collId][exId]){
      summary[collId][exId] = {sTime:"n/a",eTime:"n/a",score:0};
    }
  }

  var clearSummary = function(collId,exId){
    summary[collId].splice(exId,1);
  }

  var getSummary = function(collId,exId){
    if(summary[collId][exId]){
      return summary[collId][exId];
    }
  }

  var createColl = function(collId){
    summary[collId] = [];
  }

  var isCreated = function(collId){
    if(summary[collId]){
      return true;
    }
    return false;
  }
  
  return {
    updateStartTime: updateStartTime,
    updateEndTime: updateEndTime,
    updateScore: updateScore,
    createSummary: createSummary,
    getSummary: getSummary,
    clearSummary: clearSummary,
    createColl: createColl,
    isCreated: isCreated
  };
})

.factory('StateData', function () {
  var states = [];

  var updateState = function(collId,exId,state){
    states[collId][exId] = state;
  }

  var getSingleState = function(collId,exId){
    return states[collId][exId];
  }

  var getAllStates = function(collId){
    return states[collId];
  }

  var createColl = function(collId){
    states[collId] = [];
  }

  var isCreated = function(collId){
    if(states[collId]){
      return true;
    }
    return false;
  }
  
  return {
    updateState: updateState,
    getSingleState: getSingleState,
    getAllStates: getAllStates,
    createColl: createColl,
    isCreated: isCreated
  };
})

.factory('DragData',function(Data){
  var drags = [];

  var createColl = function(collId){
    if(!drags[collId]){
      drags[collId] = [];
    }
  }

  var createDrags = function(collId,exId){
    if(drags[collId][exId]){return;}
    drags[collId][exId] = [];
    var words = Data.getWords(collId,exId);
    if(words){
      for(var i=0;i<words.length-1;i++){
        obj = {"word":words[i].right,"isDraggable":true};
        drags[collId][exId].push(obj);
      }
    }
  }

  var getDrags = function(collId,exId){
    if(drags[collId][exId]){
      return drags[collId][exId];
    }
    return null;
  }

  var clear = function(collId,exId){
    drags[collId].splice(exId,1);
  }

  return{
    createColl:createColl,
    createDrags: createDrags,
    getDrags: getDrags,
    clear:clear
  }
})

.factory('Ids',function($cordovaNetwork,$rootScope){
  var collIds = [];
  var exIds = [];

  var getExId = function(collId,exerciseId){
    var exId = exIds[collId].indexOf(exerciseId);
    if(exId == -1){
      exIds[collId].push(exerciseId);
      exId = exIds[collId].indexOf(exerciseId);
    }
    return exId;
  }

  var getExerciseId = function(collId,exId){
    return exIds[collId][exId];
  }

  var getCollId = function(name){
    var collId = collIds.indexOf(name);
    if(collId == -1){
      collIds.push(name);
      collId = collIds.indexOf(name);
    }
    //also initiate exIds if not already done
    if(!exIds[collId]){
      exIds[collId] = [];
    }
    return collId;
  }

  var getCollName = function(collId){
    return collIds[collId];
  }

  return{
    getCollId: getCollId,
    getCollName: getCollName,

    getExId: getExId,
    getExerciseId: getExerciseId
  };
});
