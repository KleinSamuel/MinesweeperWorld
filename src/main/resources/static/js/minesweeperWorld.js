/* ############################
 * GLOBAL VARIABLES
 * ############################
 */

$(document).ready(function(){
  $("#clickSound").trigger('load');
  $("#flagSound").trigger('load');
  $("#unflagSound").trigger('load');
  $("#bombSound").trigger('load');
});
$(window).resize(function() {
  initCanvas();
  resizeBlockScreen();
});

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext("2d");
var canvasOffset;
var offsetX;
var offsetY;
var canvasWidth;
var canvasHeight;
var isDragging;
var position = {};

function initCanvas(){
  canvas.width = document.documentElement.clientWidth;
  canvas.height = document.documentElement.clientHeight-65;
  canvasOffset = $('#canvas').offset();
  offsetX = canvasOffset.left;
  offsetY = canvasOffset.top;
  canvasWidth = canvas.width;
  canvasHeight = canvas.height;
  isDragging = false;
  rightClick = false;
}

ctx.font = "10px Arial";

var posX = 0;
var posY = 0;
var oldX;
var oldY;
var mouseStartX;
var mouseStartY;

var cellSize = 50;

var clusterRequestBuffer = 10;

var stompClient = null;
var UID;

/* statistics */
var userNameMain = "";
var cellsCleared = 0;
var bombsDefused = 0;
var bombsActivated = 0;
var score = 0;

var leftBound;
var rightBound;
var upBound;
var downBound;

/* define 4 clusters */
var dataLU, dataLD, dataRU, dataRD;

function initData(positionX, positionY){
  posX = parseInt(positionX);
  posY = parseInt(positionY);
}

/* ############################
 * USER INPUT
 * ############################
 */

$('#canvas').contextmenu(function(e){
  e.preventDefault();
  e.stopPropagation();
});
function handleMouseDownLeft(e){
  mouseStartX = parseInt(e.clientX - offsetX);
  mouseStartY = parseInt(e.clientY - offsetY);
  oldX = mouseStartX;
  oldY = mouseStartY;
  isDragging = true;
}
function handleMouseDownRight(e){
  mouseStartX = parseInt(e.clientX - offsetX);
  mouseStartY = parseInt(e.clientY - offsetY);
}
function handleMouseUpLeft(e){
  var tmpMouseX = parseInt(e.clientX - offsetX);
  var tmpMouseY = parseInt(e.clientY - offsetY);
  isDragging = false;
  if(mouseStartX == tmpMouseX && mouseStartY == tmpMouseY){
    handleClickLeft(mouseStartX, mouseStartY);
  }
}
function handleMouseUpRight(e){
  var tmpMouseX = parseInt(e.clientX - offsetX);
  var tmpMouseY = parseInt(e.clientY - offsetY);
  if(mouseStartX == tmpMouseX && mouseStartY == tmpMouseY){
    handleClickRight(mouseStartX, mouseStartY);
  }
}
function handleMouseOut(e){
  isDragging = false;
}
function handleMouseMove(e){
  if(isDragging){
    var tmpMouseX = parseInt(e.clientX - offsetX);
    var tmpMouseY = parseInt(e.clientY - offsetY);
    var tmpX = oldX - tmpMouseX;
    var tmpY = oldY - tmpMouseY;
    oldX = tmpMouseX;
    oldY = tmpMouseY;
    posX += parseInt(tmpX);
    posY += parseInt(tmpY);
    var cordsLeft = convertPixelToCoordinate(0, 0);
    var cordsRight = convertPixelToCoordinate(canvasWidth, canvasHeight);
    position.xLeft = cordsLeft.x;
    position.yLeft = cordsLeft.y;
    position.xRight = cordsRight.x;
    position.yRight = cordsRight.y;

    setPositionCookie(posX, posY);
    sendPositionUpdate();
  }
}
var left = 0;
var right = 2;
$('#canvas').mousedown(function(e){
  if(e.button === left){
    handleMouseDownLeft(e);
  }else{
    handleMouseDownRight(e);
  }
});
$('#canvas').mousemove(function(e){handleMouseMove(e);});
$('#canvas').mouseup(function(e){
  if(e.button === left){
    handleMouseUpLeft(e);
  }else{
    handleMouseUpRight(e);
  }
});
$('#canvas').mouseout(function(e){handleMouseOut(e);});

function handleClickLeft(x, y){
  var coords = convertPixelToCoordinate(x, y);
  sendClick(coords.x, coords.y);
}

function handleClickRight(x, y){
  var coords = convertPixelToCoordinate(x, y);
  sendFlag(coords.x, coords.y);
}

/* ############################
 * GAME LOOP
 * ############################
 */

var lastFrameTimeMs = 0;
var maxFPS = 10;
var delta = 0;
var timestep = 1000 / 10;

function mainLoop(timestamp) {
  if (timestamp < lastFrameTimeMs + (1000 / maxFPS)) {
    requestAnimationFrame(mainLoop);
    return;
  }
  delta += timestamp - lastFrameTimeMs;
  lastFrameTimeMs = timestamp;

  while (delta >= timestep) {
    update(timestep);
    delta -= timestep;
  }
  draw();
  requestAnimationFrame(mainLoop);
}

function update(){
  if(!dataLU || !dataLD || !dataRU || !dataRD){
    return;
  }
  checkIfOutOfBounds();

  updateNavbarCellsCleared();
  updateNavbarBombsDefused();
  updateNavbarBombsActivated();
  updateNavbarScore()
}

function draw(){
  if(!dataLU || !dataLD || !dataRU || !dataRD){
    return;
  }
  clearCanvas();
  drawGrid();
}

initAll();

/* ############################
 * INITIALIZE
 * ############################
 */
function initAll(){
  /* set canvas size */
  initCanvas();

  connect();

  checkIfUserdataCookieIsSet();

  /* start animation */
  requestAnimationFrame(mainLoop);
}

function checkIfUserdataCookieIsSet(){
    var userdata = getUserdataCookie();
    if(userdata){
        console.log("Userdata found: "+userdata);
        UID = userdata;
        retrieveStats(UID);
        var oldPosition = getPositionCookie();
        initCluster(oldPosition.x, oldPosition.y);
    }else{
        console.log("Userdata not found!");
        blockScreenLogin();
    }
}

/* ############################
 * GAME LOGIC
 * ############################
 * 0 = unknown
 * 1-8 = adjacent bombs
 * 9 = empty
 * 10 = flag
 * 11 = bomb
 */

function initCluster(pixelX, pixelY){

  initData(pixelX, pixelY);

  setPositionCookie(pixelX, pixelY);

  var pixelRightX = parseInt(pixelX)+parseInt(canvasWidth);
  var pixelRightY = parseInt(pixelY)+parseInt(canvasHeight);

  var pointLeft = {x: pixelX, y: pixelY};
  var pointRight = {x: pixelRightX, y: pixelRightY};

  var coordLeft = getCoordinateForPosition(pointLeft.x, pointLeft.y);
  var clusterLeft = getClusterForCoordinates(coordLeft.x, coordLeft.y);

  var coordRight = getCoordinateForPosition(pointRight.x, pointRight.y);
  var clusterRight = getClusterForCoordinates(coordRight.x, coordRight.y);

  /* if both points are in same cluster */
  if(clusterLeft.startX == clusterRight.startX && clusterLeft.startY == clusterRight.startY){
    /* if in left buffer */
    if((pointLeft.x - clusterLeft.startX) <= clusterRequestBuffer){
        /* if in upper buffer */
        if((pointLeft.y - clusterLeft.startY) <= clusterRequestBuffer){
            getInitCluster(clusterLeft.startX-100, clusterLeft.startY-100, "LU");
            getInitCluster(clusterLeft.startX, clusterLeft.startY-100, "RU");
            getInitCluster(clusterLeft.startX-100, clusterLeft.startY, "LD");
            getInitCluster(clusterLeft.startX, clusterLeft.startY, "RD");
            leftBound = clusterLeft.startX-100;
            rightBound = clusterLeft.startX+100;
            upBound = clusterLeft.startY-100;
            downBound = clusterLeft.startY+100;
        }
        /* if in lower buffer or in none where it does not matter */
        else
          //if((clusterLeft.startY+99) - pointRight.y <= clusterRequestBuffer)
          {
            getInitCluster(clusterLeft.startX-100, clusterLeft.startY, "LU");
            getInitCluster(clusterLeft.startX, clusterLeft.startY, "RU");
            getInitCluster(clusterLeft.startX-100, clusterLeft.startY+100, "LD");
            getInitCluster(clusterLeft.startX, clusterLeft.startY+100, "RD");
            leftBound = clusterLeft.startX-100;
            rightBound = clusterLeft.startX+100;
            upBound = clusterLeft.startY;
            downBound = clusterLeft.startY+200;
        }
    }
    /* if in right buffer */
    else if(((clusterRight.startX+99) - pointRight.x) <= clusterRequestBuffer){
        /* if in upper buffer */
        if((pointLeft.y - clusterLeft.startY) <= clusterRequestBuffer){
            getInitCluster(clusterLeft.startX, clusterLeft.startY-100, "LU");
            getInitCluster(clusterLeft.startX+100, clusterLeft.startY-100, "RU");
            getInitCluster(clusterLeft.startX, clusterLeft.startY, "LD");
            getInitCluster(clusterLeft.startX+100, clusterLeft.startY, "RD");
            leftBound = clusterLeft.startX;
            rightBound = clusterLeft.startX+200;
            upBound = clusterLeft.startY-100;
            downBound = clusterLeft.startY+100;
        }
        /* if in lower buffer or in none where it does not matter */
        else {
            getInitCluster(clusterLeft.startX, clusterLeft.startY, "LU");
            getInitCluster(clusterLeft.startX+100, clusterLeft.startY, "RU");
            getInitCluster(clusterLeft.startX, clusterLeft.startY+100, "LD");
            getInitCluster(clusterLeft.startX+100, clusterLeft.startY+100, "RD");
            leftBound = clusterLeft.startX;
            rightBound = clusterLeft.startX+200;
            upBound = clusterLeft.startY;
            downBound = clusterLeft.startY+200;
        }
    }
    /* not in left or right buffer */
    else{
        getInitCluster(clusterLeft.startX-100, clusterLeft.startY-100, "LU");
        getInitCluster(clusterLeft.startX, clusterLeft.startY-100, "RU");
        getInitCluster(clusterLeft.startX-100, clusterLeft.startY, "LD");
        getInitCluster(clusterLeft.startX, clusterLeft.startY, "RD");
        leftBound = clusterLeft.startX-100;
        rightBound = clusterLeft.startX+100;
        upBound = clusterLeft.startY-100;
        downBound = clusterLeft.startY+100;
    }
  }
  /* if clusters are above */
  else if(clusterLeft.startX == clusterRight.startX && clusterLeft.startY < clusterRight.startY){
    /* if in left buffer */
    if((pointLeft.x - clusterLeft.startX) <= clusterRequestBuffer){
        getInitCluster(clusterLeft.startX-100, clusterLeft.startY, "LU");
        getInitCluster(clusterLeft.startX, clusterLeft.startY, "RU");
        getInitCluster(clusterLeft.startX-100, clusterLeft.startY+100, "LD");
        getInitCluster(clusterLeft.startX, clusterLeft.startY+100, "RD");
        leftBound = clusterLeft.startX-100;
        rightBound = clusterLeft.startX+100;
        upBound = clusterLeft.startY;
        downBound = clusterLeft.startY+200;
    }
    /* if in right buffer or not where it does not matter */
    else{
        getInitCluster(clusterLeft.startX, clusterLeft.startY, "LU");
        getInitCluster(clusterLeft.startX+100, clusterLeft.startY, "RU");
        getInitCluster(clusterLeft.startX, clusterLeft.startY+100, "LD");
        getInitCluster(clusterLeft.startX+100, clusterLeft.startY+100, "RD");
        leftBound = clusterLeft.startX;
        rightBound = clusterLeft.startX+200;
        upBound = clusterLeft.startY;
        downBound = clusterLeft.startY+200;
    }
  }
  /* if clusters are aside */
  else if(clusterLeft.startX <= clusterRight.startX && clusterLeft.startY == clusterRight.startY){
    /* if in upper buffer */
    if((pointLeft.y - clusterLeft.startY) <= clusterRequestBuffer){
        getInitCluster(clusterLeft.startX, clusterLeft.startY-100, "LU");
        getInitCluster(clusterLeft.startX+100, clusterLeft.startY-100, "RU");
        getInitCluster(clusterLeft.startX, clusterLeft.startY, "LD");
        getInitCluster(clusterLeft.startX+100, clusterLeft.startY, "RD");
        leftBound = clusterLeft.startX;
        rightBound = clusterLeft.startX+200;
        upBound = clusterLeft.startY-100;
        downBound = clusterLeft.startY+100;
    }
    /* if in lower buffer or not where it does not matter */
    else{
        getInitCluster(clusterLeft.startX, clusterLeft.startY, "LU");
        getInitCluster(clusterLeft.startX+100, clusterLeft.startY, "RU");
        getInitCluster(clusterLeft.startX, clusterLeft.startY+100, "LD");
        getInitCluster(clusterLeft.startX+100, clusterLeft.startY+100, "RD");
        leftBound = clusterLeft.startX;
        rightBound = clusterLeft.startX+200;
        upBound = clusterLeft.startY;
        downBound = clusterLeft.startY+200;
    }
  }
  /* if clusters are diagonal */
  else{
      getInitCluster(clusterLeft.startX, clusterLeft.startY, "LU");
      getInitCluster(clusterLeft.startX+100, clusterLeft.startY, "RU");
      getInitCluster(clusterLeft.startX, clusterLeft.startY+100, "LD");
      getInitCluster(clusterLeft.startX+100, clusterLeft.startY+100, "RD");
      leftBound = clusterLeft.startX;
      rightBound = clusterLeft.startX+200;
      upBound = clusterLeft.startY;
      downBound = clusterLeft.startY+200;
  }
}

/* search current 4 clusters for coordinate and return value */
function getValueInCluster(x, y){
  var keyString = getKeyString(x,y);
  if(keyString in dataLU.display){
    return dataLU.display[keyString];
  }else if(keyString in dataLD.display){
    return dataLD.display[keyString];
  }else if(keyString in dataRU.display){
    return dataRU.display[keyString];
  }else if(keyString in dataRD.display){
    return dataRD.display[keyString];
  }
}

function setValueInCluster(x, y, value){
  var keyString = getKeyString(x,y);
  if(keyString in dataLU.display){
    dataLU.display[keyString] = value;
  }else if(keyString in dataLD.display){
    dataLD.display[keyString] = value;
  }else if(keyString in dataRU.display){
    dataRU.display[keyString] = value;
  }else if(keyString in dataRD.display){
    dataRD.display[keyString] = value;
  }
}

/* check if screen is out of bounds of one of the 4 clusters */
function checkIfOutOfBounds(){
  /*left out of bounds */
  if(position.xLeft <= leftBound+clusterRequestBuffer){
      getCluster(parseInt(dataLU.startX)-100, dataLU.startY, 'LU');
      getCluster(parseInt(dataLD.startX)-100, dataLD.startY, 'LD');
      leftBound -= 100;
  }
  /*right out of bounds */
  if(position.xRight >= rightBound-clusterRequestBuffer){
      getCluster(parseInt(dataRU.startX)+100, dataRU.startY, 'RU');
      getCluster(parseInt(dataRD.startX)+100, dataRD.startY, 'RD');
      rightBound += 100;
  }
  /* up out of bounds */
  if(position.yLeft <= upBound+clusterRequestBuffer){
      getCluster(dataLU.startX, parseInt(dataLU.startY)-100, 'UL');
      getCluster(dataRU.startX, parseInt(dataRU.startY)-100, 'UR');
      upBound -= 100;
  }
  /* down out of bounds */
  if(position.yRight >= downBound-clusterRequestBuffer){
      getCluster(dataLD.startX, parseInt(dataLD.startY)+100, 'DL');
      getCluster(dataRD.startX, parseInt(dataRD.startY)+100, 'DR');
      downBound += 100;
  }
}

/* refresh two left cluster */
function refreshClusterLeftUp(clusterLU){
  dataRU = dataLU;
  dataLU = clusterLU;
}
function refreshClusterLeftDown(clusterLD){
  dataRD = dataLD;
  dataLD = clusterLD;
}
/* refresh two right cluster */
function refreshClusterRightUp(clusterRU){
  dataLU = dataRU;
  dataRU = clusterRU;
}
function refreshClusterRightDown(clusterRD){
  dataLD = dataRD;
  dataRD = clusterRD;
}
/* refresh two up cluster */
function refreshClusterUpLeft(clusterLU){
  dataLD = dataLU;
  dataLU = clusterLU;
}
function refreshClusterUpRight(clusterRU){
  dataRD = dataRU;
  dataRU = clusterRU;
}
/* refresh two down cluster */
function refreshClusterDownLeft(clusterLD){
  dataLU = dataLD;
  dataLD = clusterLD;
}
function refreshClusterDownRight(clusterRD){
  dataRU = dataRD;
  dataRD = clusterRD;
}

function setCellInDisplay(x, y, value){
    setValueInCluster(x, y, value);
    if(value == 11){
        playBombSound();
    }else{
        playClickSound();
    }
}

function setFlagInDisplay(x, y){
    setValueInCluster(x, y, 10);
    playFlagSound();
}

/* ############################
 * WEBSOCKET
 * ############################
 */

function connect() {
    var socket = new SockJS('/minesweeperworld');
    stompClient = Stomp.over(socket);

    stompClient.debug = null;

    stompClient.connect({}, function(frame) {

        console.log('Connected.');

        /* channel for cells to be opened */
        stompClient.subscribe('/notifications/clickResponse', function(clickResponse){
            var clickResponseObj = JSON.parse(clickResponse.body);
            setCellInDisplay(clickResponseObj.x, clickResponseObj.y, clickResponseObj.value);
        });
        /* channel for flags to be set */
        stompClient.subscribe('/notifications/flagResponse', function(flagResponse){
            var flagResponseObj = JSON.parse(flagResponse.body);
            setFlagInDisplay(flagResponseObj.x, flagResponseObj.y);
        });

        if(UID){
            subscribeToPersonalChannels();
        }
    }, function(disconnect){
        if(disconnect.startsWith("Whoops! Lost connection")){
            showConnectionToast("LOST CONNECTION TO SERVER..");
        }
    });
}

function subscribeToPersonalChannels(){
    /* channel for simple messages */
    stompClient.subscribe('/notifications/'+UID+"/message", function(response){
       var responseObj = JSON.parse(response.body);
       console.log("Got personal message: "+responseObj);
    });
    /* channel for flag set */
    stompClient.subscribe('/notifications/'+UID+"/flagSet", function(response){
        var responseObj = JSON.parse(response.body);
        bombsDefused += 1;
    });
    /* channel for failed flag */
    stompClient.subscribe('/notifications/'+UID+"/failedFlag", function(response){
        var responseObj = JSON.parse(response.body);
        console.log("Got personal failed flag: "+responseObj);
    });
    /* channel for bomb */
    stompClient.subscribe('/notifications/'+UID+"/bombActivated", function(response){
        var responseObj = JSON.parse(response.body);
        bombsActivated += 1;
    });
    /* channel for cleared cell */
    stompClient.subscribe('/notifications/'+UID+"/cellCleared", function(response){
        var responseObj = JSON.parse(response.body);
        cellsCleared += 1;
    });
}

function disconnect() {
    if(stompClient != null) {
        stompClient.disconnect();
    }
    //setConnected(false);
    console.log("Disconnected");
}

function sendClickRequestSocket(x, y){
    var body = {"x": parseInt(x), "y": parseInt(y), "id":UID};
    stompClient.send("/request/click", {}, JSON.stringify(body));
}

function sendFlagRequestSocket(x, y){
    var body = {"x": parseInt(x), "y": parseInt(y), "id":UID};
    stompClient.send("/request/flag", {}, JSON.stringify(body));
}

function sendPositionUpdate(){
    var body = {"x": parseInt(posX), "y": parseInt(posY)};
    stompClient.send("/request/positionUpdate", {}, JSON.stringify(body));
}


/* ############################
 * API REQUESTS
 * ############################
 */

function sendClick(x, y){
    sendClickRequestSocket(x, y);
    popPoints();
}

function sendFlag(x, y){
    sendFlagRequestSocket(x, y);
}

var pendingRequests = {};

/* request new cluster from server */
function getCluster(startX, startY, key){

  if(key in pendingRequests){
    return;
  }

  pendingRequests[key] = 1;

  console.log('Get cluster: '+key+', '+startX+':'+startY);

    var data = {
        startX: startX,
        startY: startY
    };
  $.ajax({
    url: 'http://localhost:3000/data/requestCluster',
    type: 'POST',
    contentType: 'application/json',
    dataType: 'json',
    data: JSON.stringify(data),
    success: function(response){
      if(response !== 'error'){
        if(key === 'LU'){
          refreshClusterLeftUp(response);
        }else if(key === 'LD'){
          refreshClusterLeftDown(response);
        }else if(key === 'RU'){
          refreshClusterRightUp(response);
        }else if(key === 'RD'){
          refreshClusterRightDown(response);
        }else if(key === 'UL'){
          refreshClusterUpLeft(response);
        }else if(key === 'UR'){
          refreshClusterUpRight(response);
        }else if(key === 'DL'){
          refreshClusterDownLeft(response);
        }else if(key === 'DR'){
          refreshClusterDownRight(response);
        }
      }
      delete pendingRequests[key];
    }
  });
}

function getInitCluster(startX, startY, key){

  var data = {
    startX: startX,
    startY: startY
  };
  $.ajax({
    url: 'http://localhost:3000/data/requestCluster',
    type: 'POST',
    contentType: 'application/json',
    dataType: 'json',
    data: JSON.stringify(data),
    success: function(response){
      if(response !== 'error'){
        if(key === 'LU'){
          dataLU = response;
        }else if(key === 'LD'){
          dataLD = response;
        }else if(key === 'RU'){
          dataRU = response;
        }else if(key === 'RD'){
          dataRD = response;
        }
      }
    }
  });
}

function sendLoginRequest(username, password){
    var data = {
        username: username,
        password: password
    };
    $.ajax({
        url: 'http://localhost:3000/data/login',
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify(data),
        success: function(response){
            /* userdata found in database */
            if(response.id){

                setUserdataCookie(response.id);
                UID = response.id;

                userNameMain = response.username;
                cellsCleared = response.cellsCleared;
                bombsDefused = response.bombsDefused;
                bombsActivated = response.bombsActivated;
                score = response.score;
                var positionTmp = decodeKeyString(response.position);

                initCluster(positionTmp.x, positionTmp.y);
                setPositionCookie(positionTmp.x, positionTmp.y);

                updateNavbarName();
                subscribeToPersonalChannels();
                closeLogin();
                unblockScreen();
            }
            /* userdata not found */
            else{
                console.log("ERROR login data wrong");
            }
        }
    });
}

function retrieveStats(id){
    var data = {
        id: id
    };
    $.ajax({
        url: 'http://localhost:3000/data/getStats',
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify(data),
        success: function (response) {
            console.log(response);
            if(response){
                userNameMain = response.username;
                cellsCleared = response.cellsCleared;
                bombsDefused = response.bombsDefused;
                bombsActivated = response.bombsActivated;
                score = response.score;
                updateNavbarName();
            }else{
                userNameMain = 'Guest';
                updateNavbarName();
                console.log("Init as guest");
            }
        }
    });
}

/* ############################
 * SOUNDS
 * ############################
 */
function playClickSound(){
    $("#clickSound").trigger('stop');
    $("#clickSound").trigger('play');
}
function playFlagSound(){
    $("#flagSound").trigger('stop');
    $("#flagSound").trigger('play');
}
function playUnFlagSound(){
    $("#unflagSound").trigger('stop');
    $("#unflagSound").trigger('play');
}
function playBombSound(){
    $("#bombSound").trigger('stop');
    $("#bombSound").trigger('play');
}

/* ############################
 * VISUALS
 * ############################
 */
function blockScreenLogin(){
    blockScreen("#90D7FF");
    openLogin();
}
function blockScreenInvisible(){
    blockScreen("#ffffff");
}
function resizeBlockScreen(){
    $('#screenBlocker').css('width', $(window).width);
    $('#screenBlocker').css('height', $(window).height);
}
function blockScreen(color){
    resizeBlockScreen();
    $('#screenBlocker').css('background-color', color);
    $('#screenBlocker').css('display', 'block');
}
function unblockScreen(){
    $('#screenBlocker').css('display', 'none');
}
function openLogin(){
    $('#container-login').css('display', 'block');
}
function closeLogin(){
    $('#container-login').css('display', 'none');
}

$('#login-button').click(function(){
    var username = $('#username-input').val();
    var password = $('#password-input').val();
    $('#username-input').val('');
    $('#password-input').val('');
    sendLoginRequest(username, password);
});

$('#guest-button').click(function(){
    sendLoginRequest("2bf9efa0", "");
});

$('#navbar-logout').click(function(){
    console.log("LOGOUT current user.");
    deleteCookie("positionCookie");
    deleteCookie("userdataCookie");
    userNameMain = "";
    updateNavbarName();
    cellsCleared = 0;
    bombsDefused = 0;
    bombsActivated = 0;
    score = 0;
    blockScreenLogin();
});

function showConnectionToast(message){
    blockScreenInvisible();
    $('#connection-toast').css('display', 'block');
    $('#connection-toast').text(message);
}

function updateNavbarName(){
    $('#navbar-username').text(userNameMain);
}
function updateNavbarCellsCleared(){
    $('#navbar-clearcells').text(cellsCleared);
}
function updateNavbarBombsDefused(){
    $('#navbar-bombdefused').text(bombsDefused);
}
function updateNavbarBombsActivated(){
    $('#navbar-bombactivated').text(bombsActivated);
}
function updateNavbarScore(){
    $('#navbar-score').text(score);
}

function clearCanvas(){
    ctx.clearRect(0,0,canvasWidth,canvasHeight);
    ctx.beginPath();
}

function popPoints(){
    //ctx.fillText("+100", 200, 200);
    console.log("POP");
}

function drawGrid(){

 var tmpOffsetX = (posX%cellSize)*-1;
 var tmpOffsetY = (posY%cellSize)*-1;

 var currentX = tmpOffsetX-cellSize;
 var currentY = tmpOffsetY-cellSize;

 while(currentX < canvasWidth){
   currentY = tmpOffsetY-cellSize;
   while(currentY < canvasHeight){
     var coords = convertPixelToCoordinate(currentX, currentY);
     if(coords.x < 0){
       coords.x += 1;
     }
     if(coords.y < 0){
       coords.y += 1;
     }
     var value = getValueInCluster(coords.x, coords.y);
     drawCell(currentX, currentY, value);

     currentY += cellSize;
   }
   currentX += cellSize;
 }
}

function drawCell(x, y, value){
  switch (value) {
    case 0:
      drawFieldUnknown(x,y);
      break;
    case 1:
      drawField1(x,y);
      break;
    case 2:
      drawField2(x,y);
      break;
    case 3:
      drawField3(x,y);
      break;
    case 4:
      drawField4(x,y);
      break;
    case 5:
      drawField5(x,y);
      break;
    case 6:
      drawField6(x,y);
      break;
    case 7:
      drawField7(x,y);
      break;
    case 8:
      drawField8(x,y);
      break;
    case 9:
      drawFieldEmpty(x,y);
      break;
    case 10:
      drawFieldFlag(x,y);
      break;
    case 11:
      drawFieldBomb(x,y);
      break;
  }
}

function drawFieldUnknown(x, y){
 var img = new Image();
 img.src = './assets/tileset_2/cell_unknown.png';
 ctx.drawImage(img, x, y, cellSize, cellSize);
}
function drawFieldEmpty(x, y){
 var img = new Image();
 img.src = './assets/tileset_2/cell_empty.png';
 ctx.drawImage(img, x, y, cellSize, cellSize);
}
function drawFieldFlag(x, y){
 var img = new Image();
 img.src = './assets/tileset_2/cell_flag.png';
 ctx.drawImage(img, x, y, cellSize, cellSize);
}
function drawFieldBomb(x, y){
 var img = new Image();
 img.src = './assets/tileset_2/cell_bomb.png';
 ctx.drawImage(img, x, y, cellSize, cellSize);
}
function drawField1(x, y){
 var img = new Image();
 img.src = './assets/tileset_2/cell_1.png';
 ctx.drawImage(img, x, y, cellSize, cellSize);
}
function drawField2(x, y){
 var img = new Image();
 img.src = './assets/tileset_2/cell_2.png';
 ctx.drawImage(img, x, y, cellSize, cellSize);
}
function drawField3(x, y){
 var img = new Image();
 img.src = './assets/tileset_2/cell_3.png';
 ctx.drawImage(img, x, y, cellSize, cellSize);
}
function drawField4(x, y){
 var img = new Image();
 img.src = './assets/tileset_2/cell_4.png';
 ctx.drawImage(img, x, y, cellSize, cellSize);
}
function drawField5(x, y){
 var img = new Image();
 img.src = './assets/tileset_2/cell_5.png';
 ctx.drawImage(img, x, y, cellSize, cellSize);
}
function drawField6(x, y){
 var img = new Image();
 img.src = './assets/tileset_2/cell_6.png';
 ctx.drawImage(img, x, y, cellSize, cellSize);
}
function drawField7(x, y){
 var img = new Image();
 img.src = './assets/tileset_2/cell_7.png';
 ctx.drawImage(img, x, y, cellSize, cellSize);
}
function drawField8(x, y){
 var img = new Image();
 img.src = './assets/tileset_2/cell_8.png';
 ctx.drawImage(img, x, y, cellSize, cellSize);
}

/* ############################
 * HELPER FUNCTIONS
 * ############################
 */

function convertPixelToCoordinate(pixelX, pixelY){
  var cordX = (posX+pixelX)/cellSize;
  if(cordX < 0){
    cordX -= 1;
  }
  cordX = parseInt(cordX);
  var cordY = (posY+pixelY)/cellSize;
  if(cordY < 0){
    cordY -= 1;
  }
  cordY = parseInt(cordY);
  return {x:cordX, y:cordY};
}

function getCoordinateForPosition(posPixelX, posPixelY){
  var cordX = parseInt(posPixelX/cellSize);
  if(posPixelX < 0){
    cordX -= 1;
  }
  var cordY = parseInt(posPixelY/cellSize);
  if(posPixelY < 0){
    cordY -= 1;
  }
  return {x: cordX, y: cordY};
}

function getKeyString(x, y){
  return x+'_'+y;
}
function decodeKeyString(keyString){
  var result = /(.+?)_(.+)/.exec(keyString);
  return {x: result[1], y: result[2]};
}

function getScreenWidthInCells(){
  return parseInt(canvasWidth/cellSize);
}

function getClusterForCoordinates(x, y){
  var facX = parseInt(x/100);
  if(x < 0 && (x%100)!=0){
      facX -= 1;
  }
  var startX = 100*facX;
  var facY = parseInt(y/100);
  if(y < 0 && (y%100)!=0){
      facY -= 1;
  }
  var startY = 100*facY;
  return {startX: startX, startY: startY};
}

/* set a cookie (key, value, days until expire */
function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}
/* delete a cookie by setting expiring date to past */
function deleteCookie(cname) {
    document.cookie = cname + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}
/* set a cookie that expires 2030 */
function setNeverExpireCookie(cname, cvalue){
  setCookie(cname, cvalue, 5000);
}
/* set cookie for position in pixel */
function setPositionCookie(pixelX, pixelY){
  setNeverExpireCookie("positionCookie", getKeyString(pixelX, pixelY));
}

function getCookie(cname){
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}
function getPositionCookie(){
  var value = getCookie("positionCookie");
  if(value){
    return decodeKeyString(value);
  }else{
    return {x: 0, y:0};
  }
}
function setUserdataCookie(userdatakey){
    setNeverExpireCookie("userdataCookie", userdatakey);
}
function getUserdataCookie(){
    return getCookie("userdataCookie");
}