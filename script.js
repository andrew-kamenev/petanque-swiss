let db, dbResults;

let remoteCouch = false;

function createDB(){
  db = new PouchDB('tournament');
  dbResults = new PouchDB('tournamentResults');
  remoteCouch = false;
  db.createIndex({
  index: {
    fields: ['rating', 'wins', 'buhgolts', 'buhgolts', 'points', 'games']
  }
});
  dbResults.createIndex({
    index: {
      fields: ['round']
    }
  });
}

createDB();

showRound();

dbResults.get('currentMen').then(function (doc) {

  if (doc.men && doc.men != 1) {
      $('#drawRound').hide();
      $('#nextRound').show();
      $('.add-teams').hide();
    } else {
      $('#nextRound').hide();
    }
}).catch(function (err) {
  
   let men = {
        _id: "currentMen",
        men: 1
      };
      dbResults.put(men, function callback(err, result) {
        if (!err) {
          
          $('#nextRound').hide();
        }
      });
  
});

$('#addTeam').on('click', function(){
  let team = $('#team').val();
  let rating = parseFloat($('#rating').val());

  if(team != "" && rating != ""){
    
    addTeam(team, rating);  
  }
});

$('#removeList').on('click', function(){
  db.destroy();
  dbResults.destroy().then(function () {
  createDB();
  document.location.reload();
}).catch(function (err) {
  console.log(err);
});
  $('#list').html('');
  
});

$('#drawRound').on('click', function(){
 firstRound(); 
});


$('#nextRound').on('click', function(){
  countTeamsBuhgolts();
  nextRound(); 
});

$('#countRanking').on('click', function(){
 countTeamsBuhgolts();
});

$('#showResults').on('click', function(){
 showResults();
});




$(document).on('click', '[data-event="removeTeam"]', function(){
  const id = $(this).closest('tr').data('id');
  $(this).closest('tr').remove();
  removeTeam(id);
}).on('click', '[data-event="saveResult"]', function(){
  $('.help').remove();
  let validation = true;

  $('#games').find('.game-row').each(function(){
    const teams = $(this).find('input'); 
  
    $.each(teams, function(index){
      const sign = index === 0 ? index + 1 : index - 1;
      const scoreSelf = parseInt($(teams[index]).val());
      const scoreOpponent = parseInt($(teams[sign]).val());

      if(isNaN(scoreSelf) || isNaN(scoreOpponent) || scoreOpponent === scoreSelf){
        validation = false
        $(this).closest('.game-row').append('<div class="help is-danger text-center">This result is invalid</div>');
        return false;
      }
    })
    
  });



    if(validation){

      $('#games').find('.game-row').each(function(){
      const teams = $(this).find('input');

    
      $.each(teams, function(index){
        const sign = index === 0 ? index + 1 : index - 1;
        const id = $(teams[index]).data('id');
        const opponent = $(teams[sign]).data('id');
        const scoreSelf = parseInt($(teams[index]).val());
        const scoreOpponent = parseInt($(teams[sign]).val());      
        const win = scoreSelf > scoreOpponent ? true : false;

        updateTeamRating(id, opponent, scoreSelf, scoreOpponent, win);

      });
    
      const teamIDFirst = $(teams[0]).data('id');
      const teamTitleFirst = $(teams[0]).closest('.game-row').find(`[for="${teamIDFirst}"]`).text();
      const teamScoreFirst = $(teams[0]).val();
    
      const teamIDSecond = $(teams[1]).data('id');
      const teamTitleSecond = $(teams[1]).closest('.game-row').find(`[for="${teamIDSecond}"]`).text();
      const teamScoreSecond = $(teams[1]).val();
    
      saveResulttoDB(teamTitleFirst, teamScoreFirst, teamScoreSecond, teamTitleSecond);
      $(this).remove();
    });

    $('[data-block="saveResult"]').remove();
    updateRound();
  }
  
  
}).on('click', '#importList', async function(){
  const tournamentId = $('#tournamentId').val();
  let response = await fetch(`https://portal.petanque.org.ua/tournament/team_export/${tournamentId}?format=json`);

if (response.ok) {
  
  let importedList = await response.json();

  $.each(importedList.teams,  function(index){
      addTeam(importedList.teams[index].name, +importedList.teams[index].power);
  });


} else {
  alert("Error HTTP: " + response.status);
}
});



function updateRound(){
  dbResults.get('currentMen', function(err, doc) {
   if (err) {
    return console.log(err);
  } else {

      let {_rev, men} = doc;

    $('[data-round="round-ranking"]').text(men);

      men++;

    doc = {
      _id: 'currentMen',
      _rev: _rev,
      men: men
    }

    dbResults.put(doc);

    $('[data-round="round-games"]').text(men);
    }
  
});
}

function showRound(){
  dbResults.get('currentMen').then(function (doc) {

 let {men} = doc;

 $('#games').before(`<h2 class="text-center">Round <span data-round="round-games">${men}</span></h2`);
 $('#rankingBlock').prepend(`<h2 class="text-center">After <span data-round="round-ranking">${men - 1}</span> round</h2`);
 
}).catch(function (err) {
  
   console.log(err)
   $('#games').before(`<h2 class="text-center">Round <span data-round="round-games">1</span></h2`);
 $('#rankingBlock').prepend(`<h2 class="text-center">After <span data-round="round-ranking">0</span> round</h2`);
});
}

function saveResulttoDB(teamFirst, teamFirstScrore, teamSecond, teamSecondScore){
    
   dbResults.get('currentMen').then(function (doc) {

 let {men} = doc;
 

   let gameResult = {
    _id: new Date().toISOString(),
    round: men,
    game: [teamFirst, teamFirstScrore, teamSecond, teamSecondScore]
}

 dbResults.put(gameResult, function callback(err, result) {

    if (!err) {
        console.log("Add Result");
    } else {
      console.log(err)
    }
  });

}).catch(function (err) {
  
   console.log(err)
});

 

}



function showResults(){

  dbResults.find({
    selector: {
      round: {'$gte': null}
    },
    sort: [{round: 'asc'}]
  }, function (err, result) {
    if (err) { return console.log(err); }

    $('#results').html('');
    $.each(result.docs, function(index){
      if (result.docs[index].round) {
        let technical = result.docs[index].game[3] === "Technical" ? "has-text-danger" : "";
        $('#results').append(`<tr><td><strong>R${result.docs[index].round} </strong></td>
        <td>${result.docs[index].game[0]}</td><td>${result.docs[index].game[1]}</td><td>${result.docs[index].game[2]}</td><td class="${technical}">${result.docs[index].game[3]}</td></tr>`);
      }
  
  })


  });
  
}


function updateTeamRating(id, opponent, scoreSelf, scoreOpponent, win){
  db.get(id, function(err, doc) {
   if (err) {
    return console.log(err);
  } else {

    if(id != 'tech'){
      let {_rev, rating, title, opponents, wins, buhgolts, mBuhgolts, points, wasTechnical} = doc;
    
      if(opponent === 'tech'){
        wasTechnical = true;
      } else {
        opponents.push(opponent);
      }

      if (win) {
        wins++;
      }
      points = points + (scoreSelf - scoreOpponent);

    doc = {
      _id: id,
      _rev: _rev,
      title: title,
      rating: rating,
      opponents: opponents,
      wins: wins,
      buhgolts: buhgolts,
      mBuhgolts: mBuhgolts,
      points: points,
      wasTechnical: wasTechnical

    }

    db.put(doc);
    }
  }
});

}

function removeTeam(id){

  db.get(id, function(err, doc) {
   if (err) {
    return console.log(err);
  } else {

    const thisRev = doc._rev;

    doc = {
      _id: id,
      _rev: thisRev,
    }

    db.remove(doc);
  }
});
}


function addTeam(title, rating) {

  let team = {
    _id: new Date().toISOString(),
    title: title,
    rating: rating,
    opponents: [],
    wins: 0,
    buhgolts: 0,
    mBuhgolts: 0,
    points: 0,
    wasTechnical: false
  };
  db.put(team, function callback(err, result) {
    if (!err) {

    }
  });
  $('#list').append(`<tr data-id="${team._id}"><td>${title}</td><td class="td-100">${rating}</td><td class="td-50"><a class="delete" data-event="removeTeam"></a></td></tr>`);
}



function showTeams() {
  db.find({
    selector: {
      rating: {'$gte': null}
    },
    sort: [{rating: 'desc'}]
  }, function (err, result) {
    if (err) { return console.log(err); }
  
    showTeam(result.docs);

  });
}

function showTeam(teams){
  $.each(teams, function(index){
    const id = teams[index]._id || teams[index].id;
    const title = teams[index].title || teams[index].name;
    const rating = teams[index].rating || teams[index].power;
    $('#list').append(`<tr data-id="${id}"><td>${title}</td><td class="td-100">${rating}</td><td class="td-50"><a class="delete" data-event="removeTeam"></a></td></tr>`);
  })
}


function firstRound(){
  
  $('.add-teams').hide();

  db.find({
    selector: {
      rating: {'$gte': null}
    },
    sort: [{rating: 'desc'}]
  }, function (err, result) {
    if (err) { return console.log(err); }

    console.log(result.docs);

    const isTechnical = result.docs.length % 2 === 1 ? true : false;
    const teamsLength = isTechnical ? result.docs.length/2 - 0.5 : result.docs.length/2;
  

    for (let i = 0; i < teamsLength; i++) {
  
      $('#games').append(`<div class="game-row">
        <span class="text-right"><label for="${result.docs[i]._id}">${result.docs[i].title}</label></span>
        <span class="text-center lh-40 score-block"><input class="input -small" type="number" min="0" max="13" id="${result.docs[i]._id}" data-id="${result.docs[i]._id}"/> vs <input class="input -small" type="number" min="0" max="13" id="${result.docs[teamsLength + i]._id}" data-id="${result.docs[teamsLength + i]._id}"/></span>
        <span><label for="${result.docs[teamsLength + i]._id}">${result.docs[teamsLength + i].title}</label></span>
        </div>`);

    }

    if(isTechnical){
      $('#games').append(`<div class="game-row">
        <span class="text-right"><label for="${result.docs[result.docs.length - 1]._id}">${result.docs[result.docs.length - 1].title}</label></span>
        <span class="text-center lh-40 score-block"><input class="input -small" type="number" value="13" id="${result.docs[result.docs.length - 1]._id}" data-id="${result.docs[result.docs.length - 1]._id}" disabled/> vs <input class="input -small" type="number" value="7" id="tech" data-id="tech" disabled/></span>
        <span><label for="tech" class="has-text-danger">Technical</label></span>
        </div>`);
    }
  
  $('#games').append('<div class="text-center" data-block="saveResult"><button class="button is-success" data-event="saveResult">Save results</button></div>');

  });

  $('#drawRound').hide();
  $('#nextRound').show();
}

function countTeamsBuhgolts(){
  db.find({
    selector: {
      rating: {'$gte': null}
    },
    sort: [{rating: 'desc'}]
  }, function (err, result) {
    if (err) { return console.log(err); }

    let teams = result.docs;

    console.log(teams);

    teams.forEach(function(item, i){
 
      let currentBuhgolts = 0;
      let currentMBuhgolts = 0;

      item.opponents.forEach(function(item, i){

        opponentWins = teams.find(obj => obj._id === item).wins;
        opponentBuhgolts = teams.find(obj => obj._id === item).buhgolts;

        currentBuhgolts = currentBuhgolts + opponentWins;
        currentMBuhgolts = currentMBuhgolts + opponentBuhgolts;

      })
      db.get(item._id).then(function(res){
       
        let {_id, _rev, rating, title, opponents, wins, buhgolts, mBuhgolts, points, wasTechnical} = res;
        
        buhgolts = currentBuhgolts;
        mBuhgolts = currentMBuhgolts;
        
        let doc = {
          _id: _id,
          _rev: _rev,
          title: title,
          rating: rating,
          opponents: opponents,
          wins: wins,
          buhgolts: buhgolts,
          mBuhgolts: mBuhgolts,
          points: points,
          wasTechnical: wasTechnical
        }


        return doc;

      }).then(function(doc){
        
        db.put(doc, function callback(err, result){
          if (!err) {
            // console.log(result)
          } else {
            console.log(err)
          }
        }); 
      }).then(function(){
        db.createIndex({
    index: {
      fields: ['wins', 'buhgolts', 'mBuhgolts', 'points', 'rating']
    }
  }).then(function (response) {
  
    return db.find({
      selector: {
        wins: { '$gte': null },
        buhgolts: { '$gte': null },
        mBuhgolts: {'$gte': null},
        points: { '$gte': null },
        rating: { '$gte': null }
      },
      sort: [{wins: 'desc'}, {buhgolts: 'desc'}, {mBuhgolts: 'desc'}, {points: 'desc'}, {rating: 'desc'}]
    });
  }).then(function (response) {
    $('#ranking').html('')
  
    $.each(response.docs, function(index){
  
    $('#ranking').append(`<tr data-id="${response.docs[index]._id}"><td><span class="count"></span></td>  <td>${response.docs[index].title}</td><td>${response.docs[index].wins}</td><td>${response.docs[index].buhgolts}</td><td>${response.docs[index].mBuhgolts}</td><td>${response.docs[index].points}</td><td>${response.docs[index].rating}</td></tr>`);
  })
      });
});
  });
});
}

function nextRound() {
  $('#games').html('');
    // Create index on two fields
  db.createIndex({
    index: {
      fields: ['wins', 'buhgolts', 'mBuhgolts', 'points', 'rating']
    }
  }).then(function (response) {
  
    return db.find({
      selector: {
        wins: { '$gte': null },
        buhgolts: { '$gte': null },
        mBuhgolts: { '$gte': null },
        points: { '$gte': null },
        rating: { '$gte': null }
      },
      sort: [{wins: 'desc'}, {buhgolts: 'desc'}, {mBuhgolts: 'desc'}, {points: 'desc'}, {rating: 'desc'}]
    });
  }).then(function (response) {
    
    let teamList = response.docs;
    
    const isTechnical = teamList.length % 2 === 1 ? true : false;
    const teamsLength = isTechnical ? teamList.length - 2 : teamList.length - 1;
    
    if (isTechnical) {
      let teamWithTechnical;
 

      for(let i = teamList.length - 1; i > 0; i--){
       

          if(teamList[i].wasTechnical === false){
            teamWithTechnical = teamList[i];
            
            teamList.splice(i, 1);
            break;
          }
      }

        $('#games').append(`<div class="game-row">
          <span class="text-right"><label for="${teamWithTechnical._id}">${teamWithTechnical.title}</label></span>
          <span class="text-center lh-40 score-block"><input class="input -small" type="number" value="13" id="${teamWithTechnical._id}" data-id="${teamWithTechnical._id}" disabled/> vs <input class="input -small" type="number" value="7" id="tech" data-id="tech" disabled/></span>
          <span><label for="tech" class="has-text-danger">Technical</label></span>
          </div>`);  
     
    }

    let listForDraw = teamList;
    
    /*while(listForDraw.length){
      console.log(listForDraw);

      drawPair(listForDraw);
    }*/

    console.log(listForDraw);

    while ($('#games .game-row').length < teamList.length/2) {
      console.log($('#games .game-row').length, teamList.length/2);
        
      if(drawPair(listForDraw) === false){
        
        console.log(5465465465464);

        increaseDrawList();
        console.log(JSON.stringify(listForDraw));

        while(drawPair(listForDraw, true) === 'needIncreaseList'){
          increaseDrawList();
        }
      };
    }

    $('#games').append('<div class="text-center" data-block="saveResult"><button type="submit" class="button is-success" data-event="saveResult">Save results</button></div>');

    function increaseDrawList(){
      console.log(JSON.stringify(listForDraw));
      let lastGame = $('#games').find('.game-row').last();

      let teamsToRemove = lastGame.find('input');



      for (let i = teamsToRemove.length - 1; i >= 0; i--) {
          console.log(i);
         let curId = $(teamsToRemove).eq(i).data('id');


         console.log(curId);
        
        let found = teamList.find(function(element) {
          return element._id === curId;
        });
      
        found.drawed = false;
        listForDraw.unshift(found);
      }

      
      lastGame.remove();
    }

    function drawPair(teamList, countFromDown){
      console.log(countFromDown);
      if (!teamList.length) {
        return true;
      }

      let indexOwn, indexOpponent;
      if (countFromDown) {
        indexOwn = teamList.length - 1; 
        indexOpponent = indexOwn - 1;
      } else {
        indexOwn = 0; 
        indexOpponent = indexOwn + 1;
      }
      console.log(teamList[indexOpponent]._id);
      if (teamList.length === 2 && checkOpponent(teamList[indexOpponent]._id, teamList[indexOwn].opponents)) {
          return false
      } else {
        console.log(teamList, indexOpponent);
        
         while(checkOpponent(teamList[indexOpponent]._id, teamList[indexOwn].opponents)){
          if (countFromDown) {
            indexOpponent = indexOpponent - 1;
            console.log(teamList[indexOpponent - 1]);
            if(teamList[indexOpponent - 1] === undefined){
              console.log('needIncreaseList');
              return 'needIncreaseList'
            }
          } else {
            indexOpponent = indexOpponent + 1;  
            console.log(teamList[indexOpponent - 1]._id);
          }          
        };
      }
      
      /*while(checkOpponent(teamList[indexOpponent]._id, teamList[indexOwn].opponents)){
        indexOpponent++;
      };*/

    
      $('#games').append(`<div class="game-row">
        <span class="text-right"><label for="${teamList[indexOwn]._id}">${teamList[indexOwn].title}</label></span>
        <span class="text-center lh-40 score-block"><input class="input -small" type="number" min=0 max=13 id="${teamList[indexOwn]._id}" data-id="${teamList[indexOwn]._id}"/> vs 
        <input class="input -small" type="number" min=0 max=13 id="${teamList[indexOpponent]._id}" data-id="${teamList[indexOpponent]._id}"/></span>
        <span><label for="${teamList[indexOpponent]._id}">${teamList[indexOpponent].title}</label></span>
        </div>`);  
      
      console.log(`${teamList[indexOwn].title} vs ${teamList[indexOpponent].title}`)
     
      teamList[indexOpponent].drawed = true;
      teamList[indexOwn].drawed = true;

      listForDraw = teamList.filter(function(item) {
        return item.drawed === undefined || item.drawed === false;
      });
     
    }
  }).catch(function (err) {
    console.log(err);
    
    $('#games').append('<p class="text-center has-text-danger">Can\'t draw teams correctly. Maybe number of rounds to play is too much for current teams number</p>')
  });
}


function checkOpponent(title, list){
  
  let opponentRepeat = false;
  for (const index in list){

    if(list[index] === title){
      opponentRepeat = true;
   
    } 
  }
console.log(opponentRepeat);
  return opponentRepeat;
}


showTeams();

$('.tabs a').on('click', function (event) {
    event.preventDefault();
    
    $('.tabs .is-active').removeClass('is-active');
    $(this).parent().addClass('is-active');
    $('.tabs-content').hide();
    $($(this).attr('href')).show();
});

$('.tabs a:first').trigger('click'); // Default