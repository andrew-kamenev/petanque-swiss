const db = new PouchDB('tournament');
const dbResults = new PouchDB('tournamentResults');

let remoteCouch = false;


dbResults.get('currentMen').then(function (doc) {

  if (doc.men && doc.men != 1) {
      $('#drawRound').hide();
      $('#nextRound').show();
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
  dbResults.destroy();
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
  const teams = $(this).closest('.game-row').find('input');
  let validation = true;

  $.each(teams, function(index){
    const sign = index === 0 ? index + 1 : index - 1;
    const id = $(teams[index]).data('id');
    const opponent = $(teams[sign]).data('id');
    const scoreSelf = parseInt($(teams[index]).val());
    const scoreOpponent = parseInt($(teams[sign]).val());
    const win = scoreSelf > scoreOpponent ? true : false;

    if(!scoreSelf || !scoreOpponent){

      validation = false
      return false;
    }

    updateTeamRating(id, opponent, scoreSelf, scoreOpponent, win);

  });

  if(validation){
    
      const teamIDFirst = $(teams[0]).data('id');
      const teamTitleFirst = $(teams[0]).closest('.game-row').find(`[for="${teamIDFirst}"]`).text();
      const teamScoreFirst = $(teams[0]).val();
    
      const teamIDSecond = $(teams[1]).data('id');
      const teamTitleSecond = $(teams[1]).closest('.game-row').find(`[for="${teamIDSecond}"]`).text();
      const teamScoreSecond = $(teams[1]).val();
    
    saveResulttoDB(teamTitleFirst, teamScoreFirst, teamScoreSecond, teamTitleSecond);
    $(this).closest('.game-row').remove();
  }
  
});

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
        
    } else {
      console.log(err)
    }
  });

}).catch(function (err) {
  
   console.log(err)
});

 

}

dbResults.createIndex({
    index: {
      fields: ['round']
    }
  });

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
        $('#results').append(`<tr><td><strong>R${result.docs[index].round} </strong></td>
        <td>${result.docs[index].game[0]}</td><td>${result.docs[index].game[1]}</td><td>${result.docs[index].game[2]}</td><td>${result.docs[index].game[3]}</td></tr>`);
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
      let {_rev, rating, title, opponents, wins, buhgolts, points, wasTechnical} = doc;
    
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
    points: 0,
    wasTechnical: false
  };
  db.put(team, function callback(err, result) {
    if (!err) {

    }
  });
  $('#list').append(`<tr data-id="${team._id}"><td>${title}</td><td class="td-100">${rating}</td><td class="td-50"><a class="delete" data-event="removeTeam"></a></td></tr>`);
}

db.createIndex({
  index: {
    fields: ['rating', 'wins', 'buhgolts', 'points', 'games']
  }
});

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
    $('#list').append(`<tr data-id="${teams[index]._id}"><td>${teams[index].title}</td><td class="td-100">${teams[index].rating}</td><td class="td-50"><a class="delete" data-event="removeTeam"></a></td></tr>`);
  })
}


function firstRound(){
  dbResults.get('currentMen').then(function (doc) {

 let {men} = doc;

 $('#games').append(`<h2 class="text-center">Round ${men}</h2`);
 
}).catch(function (err) {
  
   console.log(err)
});

  db.find({
    selector: {
      rating: {'$gte': null}
    },
    sort: [{rating: 'desc'}]
  }, function (err, result) {
    if (err) { return console.log(err); }

    

    const isTechnical = result.docs.length % 2 === 1 ? true : false;
    const teamsLength = isTechnical ? result.docs.length/2 - 0.5 : result.docs.length/2;
  

    for (let i = 0; i < teamsLength; i++) {
  
      $('#games').append(`<div class="game-row">
        <span class="text-right"><label for="${result.docs[i]._id}">${result.docs[i].title}</label></span>
        <span class="text-center lh-40"><input class="input -small" type="number" id="${result.docs[i]._id}" data-id="${result.docs[i]._id}"/> vs <input class="input -small" type="number" id="${result.docs[teamsLength + i]._id}" data-id="${result.docs[teamsLength + i]._id}"/></span>
        <span><label for="${result.docs[teamsLength + i]._id}">${result.docs[teamsLength + i].title}</label></span>
        <div class="text-center"><button class="button is-success" data-event="saveResult">Save result</button></div>
        </div>`);

    }

    if(isTechnical){
      $('#games').append(`<div class="game-row">
        <span class="text-right"><label for="${result.docs[result.docs.length - 1]._id}">${result.docs[result.docs.length - 1].title}</label></span>
        <span class="text-center lh-40"><input class="input -small" type="number" value="13" id="${result.docs[result.docs.length - 1]._id}" data-id="${result.docs[result.docs.length - 1]._id}" disabled/> vs <input class="input -small" type="number" value="7" id="tech" data-id="tech" disabled/></span>
        <span><label for="tech">Technical</label></span>
        <div class="text-center"><button class="button is-success" data-event="saveResult">Save result</button></div>
        </div>`);
    }

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

    teams.forEach(function(item, i){
 
      let currentBuhgolts = 0;

      item.opponents.forEach(function(item, i){

        opponentWins = teams.find(obj => obj._id === item).wins;

        currentBuhgolts = currentBuhgolts + opponentWins;

      })
      db.get(item._id).then(function(res){
       
        let {_id, _rev, rating, title, opponents, wins, buhgolts, points, wasTechnical} = res;
        
        buhgolts = currentBuhgolts;
        
        let doc = {
          _id: _id,
          _rev: _rev,
          title: title,
          rating: rating,
          opponents: opponents,
          wins: wins,
          buhgolts: buhgolts,
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
      fields: ['wins', 'buhgolts', 'points', 'rating']
    }
  }).then(function (response) {
  
    return db.find({
      selector: {
        wins: { '$gte': null },
        buhgolts: { '$gte': null },
        points: { '$gte': null },
        rating: { '$gte': null }
      },
      sort: [{wins: 'desc'}, {buhgolts: 'desc'}, {points: 'desc'}, {rating: 'desc'}]
    });
  }).then(function (response) {
    $('#ranking').html('')
    $.each(response.docs, function(index){
  
    $('#ranking').append(`<tr data-id="${response.docs[index]._id}"><td><span class="count"></span></td>  <td>${response.docs[index].title}</td><td>${response.docs[index].wins}</td><td>${response.docs[index].buhgolts}</td><td>${response.docs[index].points}</td><td>${response.docs[index].rating}</td></tr>`);
  })
      });
});
  });
});
}

function nextRound() {
  dbResults.get('currentMen', function(err, doc) {
   if (err) {
    return console.log(err);
  } else {

      let {_rev, men} = doc;
    
      men++;

  $('#games').html('').append(`<h2 class="text-center">Round ${men}</h2>`)

    doc = {
      _id: 'currentMen',
      _rev: _rev,
      men: men
    }

    dbResults.put(doc);
    }
  
});
    // Create index on two fields
  db.createIndex({
    index: {
      fields: ['wins', 'buhgolts', 'points', 'rating']
    }
  }).then(function (response) {
  
    return db.find({
      selector: {
        wins: { '$gte': null },
        buhgolts: { '$gte': null },
        points: { '$gte': null },
        rating: { '$gte': null }
      },
      sort: [{wins: 'desc'}, {buhgolts: 'desc'}, {points: 'desc'}, {rating: 'desc'}]
    });
  }).then(function (response) {
    $('#ranking').html('')
    $.each(response.docs, function(index){
  
    $('#ranking').append(`<tr data-id="${response.docs[index]._id}"><td><span class="count"></span></td>  <td>${response.docs[index].title}</td><td>${response.docs[index].wins}</td><td>${response.docs[index].buhgolts}</td><td>${response.docs[index].points}</td><td>${response.docs[index].rating}</td></tr>`);
  })
    
    let teamList = response.docs;

    const isTechnical = teamList.length % 2 === 1 ? true : false;
    const teamsLength = isTechnical ? teamList.length - 2 : teamList.length - 1;
    console.log(isTechnical);
    if (isTechnical) {
      let teamWithTechnical;
      console.log(teamList);

      for(let i = teamList.length - 1; i > 0; i--){
       

          if(teamList[i].wasTechnical === false){
            teamWithTechnical = teamList[i];
            
            teamList.splice(i, 1);
            break;
          }
      }

        $('#games').append(`<div class="game-row">
          <span class="text-right"><label for="${teamWithTechnical._id}">${teamWithTechnical.title}</label></span>
          <span class="text-center lh-40"><input class="input -small" type="number" value="13" id="${teamWithTechnical._id}" data-id="${teamWithTechnical._id}" disabled/> vs <input class="input -small" type="number" value="7" id="tech" data-id="tech" disabled/></span>
          <span><label for="tech">Technical</label></span>
          <div class="text-center"><button class="button is-success" data-event="saveResult">Save result</button></div>
          </div>`);  
     
    }

    while(teamList.length){
      drawPair(teamList);
    }

    function drawPair(teamList){
      
      let indexOwn = 0; 

      let indexOpponent = indexOwn + 1;

      while(checkOpponent(teamList[indexOpponent]._id, teamList[indexOwn].opponents)){
        indexOpponent++;
      };

      // while(checkOpponent(teamList[indexOpponent]._id, teamList[indexOwn].opponents)){
      //   console.log("!!!They played!!!")
      //   indexOpponent++;
      // } 


        $('#games').append(`<div class="game-row">
          <span class="has-text-right"><label for="${teamList[indexOwn]._id}">${teamList[indexOwn].title}</label></span>
          <span class="has-text-centered lh-40"><input class="input -small" type="number" id="${teamList[indexOwn]._id}" data-id="${teamList[indexOwn]._id}"/> vs 
          <input class="input -small" type="number" id="${teamList[indexOpponent].title}" data-id="${teamList[indexOpponent]._id}"/></span>
          <span><label for="${teamList[indexOpponent]._id}">${teamList[indexOpponent].title}</label></span>
          <div class="has-text-centered"><button class="button is-success" data-event="saveResult">Save result</button></div>
          </div>`);  
      
  
      teamList.splice(indexOpponent,1);
 
      teamList.splice(indexOwn,1);
     
    }
  }).catch(function (err) {
    $('#games').append('<p class="text-center has-text-danger">Can\'t draw teams correctly. Maybe number of rounds to play is too mush for current teams number</p>')
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

/*db.allDocs(function (err, response) {
  console.log(response);
});*/

showTeams();

$('.tabs a').on('click', function (event) {
    event.preventDefault();
    
    $('.tabs .is-active').removeClass('is-active');
    $(this).parent().addClass('is-active');
    $('.tabs-content').hide();
    $($(this).attr('href')).show();
});

$('.tabs a:first').trigger('click'); // Default