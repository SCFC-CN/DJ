( function() {


  var ready = false,
      faceElementList = [],
      sequenceOrder = [ 7, 6, 3, 0, 1, 2, 5, 8 ],
      backgroundXMap = {
        'up': 0,
        'down': 15,
        'front': 30,
        'left': 45,
        'right': 60,
        'back': 75
      },
      currentStep = 0,
      playing = false,
      faceNormals = [],
      activeSteps = { a : {}, b : {} },
      drumCubeWrappers = [],
      variation = 'a',
      isMobile = detectmobile(),
      mobileAudioStarted = false,
      shuffling = false,
      shuffleStep = 0,
      stepCount = 0,
      shortURLUpdate,
      backgroundCanvas,
      canvasContext,
      cube,
      sequencer,
      resetButton,
      tapButton,
      tapTime,
      playButton,
      variationButton,
      tempoSlider,
      tempoSliderHandle,
      bpmText,
      masterGainKnob,
      masterGainKnobBG,
      // meter,
      shareElement,
      gPlusElement,
      twitterElement,
      fbElement,
      canonicalURLElement,
      shortURL,
      width,
      height,
      haloColor,
      haloTween,
      solidBGColor,
      solidBGTween,
      recordingTimeout,

      cubeContainerHeightRatio = .77,
      cubeContainerHeight,
      isAndroid



  function setup() {

    var ie = (function(){

        var undef,
            v = 3,
            div = document.createElement('div'),
            all = div.getElementsByTagName('i');

        while (
            div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->',
            all[0]
        );

        return v > 4 ? v : undef;

    }())

    //show error page if CSS3D or Web Audio is not supported
    if( ie || !has3d() || ( !window.AudioContext && !window.AudioContext && !window.webkitAudioContext ) ){
      document.querySelector('#browser-issue').style.display = 'block'
    }

    //detect Android for canvas drawing bug
    isAndroid = detectAndroid()


    //prevent dragging logo on mobile    
    document.querySelector( 'div#nav div.logo' ).addEventListener('touchstart', 
      function(e){ 
        e.preventDefault() 

      })

    var sf3 = localStorage.getItem( 'sf-3' )
    if( !sf3 && !isMobile )
      document.querySelector( 'div#secret-feature-1' ).style.display = 'inline-block';

      document.querySelector( 'span.close-button' ).addEventListener( 'click', function( event ){

      event.preventDefault()

      document.querySelector( 'div#secret-feature-1' ).style.display = 'none';
      // Store
      localStorage.setItem('sf-3', 'true')
      return

    })

    //setup initial halo and background color objects and tween instances
    haloColor = { r: 245,  g: 238,  b: 106}
    haloTween = new TWEEN.Tween( haloColor )

    solidBGColor = { r: 199,  g: 95,  b: 67}
    solidBGTween = new TWEEN.Tween( solidBGColor )



    // Socialite.load()
    // Socialite.process()

    //get URL and share elements

    canonicalURLElement = document.querySelector("link[rel='canonical']")
    shareElement = document.querySelector( 'footer ul.share li.share-link span' )
    gPlusElement = document.querySelector( 'footer ul.share li.g-plus a' )
    twitterElement = document.querySelector( 'footer ul.share li.twitter a' )
    fbElement = document.querySelector( 'footer ul.share li.fb a' )


    var date = new Date(),
        time = date.getTime(),
        tempoSliderX = 0,
        masterGainKnobY = 0,
        centerFace,
        dsCube,
        drumTypeElement,
        stickerElement

    //setup background canvas
    backgroundCanvas = document.querySelector( '.scrolling-gradient canvas' )
    canvasContext = backgroundCanvas.getContext( '2d' )

    //save window dimensions and cube container height
    width = window.innerWidth
    height = window.innerHeight
    cubeContainerHeight = cubeContainerHeightRatio * height

    //update background
    resizeBackgroundGradient()

    //initalize tap time for tap tempo
    tapTime = time

    //create new cube and save to window for console access
    window.cube = cube = new ERNO.Cube()
      cube.camera.position.y = 0
      if( isMobile )
        cube.camera.setLens( 30 )
      else
        cube.camera.setLens( 35 )

    //attach cube to container element
    document.querySelector( '#container' ).appendChild( cube.domElement )

    //create new sequencer
    sequencer = new DrumSequencer({

      sampleLoadStartCallback: sampleLoadStartHandler,
      sampleLoadCompleteCallback: sampleLoadCompleteHandler

    })

    //update active steps from query vars
    parseURL()





    // loop through cube sides and setup center faces for sample title, selection, loader
    cube.faces.forEach( function( face, i ) {

      var sampleElement,
          loaderElement = document.createElement( 'div' )

      //get face object
      centerFace = face.cubelets[ 4 ][ face.name ]
      //add class to id center face
      centerFace.element.classList.add( 'center' )
      //save face name to center element
      centerFace.element.dataset.faceName = face.name

      //get center sticker element
      stickerElement = centerFace.element.querySelector( 'div.sticker' )
      
      //create element and add sequencer track title
      drumTypeElement = document.createElement( 'span' )
      drumTypeElement.appendChild( document.createTextNode( sequencer.trackTitles[ i ] ) )
      drumTypeElement.classList.add( 'drum-type' )
      stickerElement.appendChild( drumTypeElement )

      //add sample icon for each sample in track
      sequencer.sampleCollectionURLs[ i ].forEach( function() {
        sampleElement = document.createElement( 'div' )
        sampleElement.classList.add( 'sample' )
        stickerElement.appendChild( sampleElement )
      })

      //highlight selected sample
      stickerElement.children[ 1 ].classList.add( 'on' )

      //attach loader
      loaderElement.classList.add( 'loader' )
      stickerElement.appendChild( loaderElement )

    })

    // add wrapper divs to cubelets for step animation transformations and add step shadow element
    cube.cubelets.forEach( function( cubelet ) {

      //create wrapper element and THREE object
      var wrapperElement = document.createElement( 'div' ),
        drumCubeWrapper = new THREE.CSS3DObject( wrapperElement ),
        stepShadowElement

      //attach cubelet's children to wrapper
      while ( cubelet.css3DObject.element.hasChildNodes() ) {
        wrapperElement.appendChild( cubelet.css3DObject.element.firstChild )
      }

      //attach wrapper to element
      cubelet.css3DObject.element.appendChild( wrapperElement )

      wrapperElement.classList.add( 'drum-shuffle-cubelet-wrapper' )
      wrapperElement.classList.add( 'cubelet' )

      //save wrapper element to list
      drumCubeWrappers.push( wrapperElement )

      //create array for cubelet face normals
      faceNormals[ cubelet.address ] = []

      //loop through cubelet faces
      cubelet.faces.forEach( function( face ) {

        if ( !face.element.classList.contains( 'center' ) ) {

          //save non-center face normal by cubelet address 
          faceNormals[ cubelet.address ].push( face.normal )

          // append step shadow elements to faces that have stickers (external facing)
          stickerElement = face.element.querySelector( 'div.sticker' )
          if ( stickerElement ) {
            stepShadowElement = document.createElement( 'div' )
            stepShadowElement.classList.add( 'shadow' )
            stickerElement.appendChild( stepShadowElement )
          }

        }
        else{

          wrapperElement.classList.add( 'center' )

        }
      })
    })

    //add event listener for cube twists
    cube.addEventListener( 'onTwistComplete', function( event ) {

      updateActiveSteps()
      // updateSteps()
      updateFaceElementList()

    })
    
    updateFaceElementList()
    updateSteps()

    //cube click handler for sequencer step selection and track sample cycling
    cube.addEventListener( 'click', function( event ) {

      //get clicked cubelet and cube face that was clicked
      var cubelet = event.detail.cubelet,
          faceName = event.detail.face

      //transform faceName from cube face (TOP) to cubelet face (UP)
      faceName = ( faceName === 'TOP' ) ? 'UP' : faceName

      //get cubelet element
      var element = cubelet[ faceName.toLowerCase() ].element
      
      if ( element ) {

        //get stepId from element's dataset (0-7)
        var stepId = cubelet[ faceName.toLowerCase() ].element.dataset[ 'stepId' ]

        //center faces do not have a stepId
        if ( !stepId ) {

          //centerFaceName corresponds to related sequencer track Id
          var centerFaceName = cube[ faceName.toLowerCase() ].cubelets[ 4 ][ faceName.toLowerCase() ].element.dataset.faceName

          sequencer.cycleSample( centerFaceName.toUpperCase() )

          //audition samples for tracks that do not have selected steps or sequencer is stopped
          if( !activeSteps[variation][ centerFaceName ] || !sequencer.playing )
            sequencer.playSample( centerFaceName.toUpperCase(), 0 )

          //push down center face, simulating button press
          if ( centerFaceName == 'right' ) {
            element.parentElement.style.webkitTransform = 'translate3d(-30px, 0, 0)'
          } else if ( centerFaceName == 'left' ) {
            element.parentElement.style.webkitTransform = 'translate3d(30px, 0, 0)'
          } else if ( centerFaceName == 'down' ) {
            element.parentElement.style.webkitTransform = 'translate3d(0, -30px, 0)'
          } else if ( centerFaceName == 'up' ) {
            element.parentElement.style.webkitTransform = 'translate3d(0, 30px, 0)'
          } else if ( centerFaceName == 'front' ) {
            element.parentElement.style.webkitTransform = 'translate3d(0, 0, -30px)'
          } else if ( centerFaceName == 'back' ) {
            element.parentElement.style.webkitTransform = 'translate3d(0, 0, 30px)'
          }

          //todo: move to css animation
          //push up center face after click
          window.setTimeout( function(){
            element.parentElement.style.webkitTransform = 'translate3d(0, 0, 0px)'
          }, 80)

          //updates selected sample icon
          updateSampleSelectionElements()
          updateActiveSteps()

        } else {

          //add or remove step from activeSteps
          toggleStep( element )

        }
      }
    })

    var bucketElements = document.querySelectorAll( 'div#sample-buckets div.buckets div.bucket' )

    underscore.each( bucketElements, function( element){

      element.addEventListener( 'dragenter', function( event ){

        event.toElement.style.opacity = '.5'
        event.preventDefault()
        event.stopPropagation()
        console.log( event )

      })

      element.addEventListener( 'dragleave', function( event ){

        event.toElement.style.opacity = '1'
        event.preventDefault()
        event.stopPropagation()
        console.log( event )

      })

      element.addEventListener( 'drop', createDropHandler( element.dataset.faceName.toUpperCase() ), false )

    })

    function createDropHandler( sampleId ){

      var sampleId = sampleId
      return function( event ){

        document.querySelector( 'div#sample-buckets' ).style.display = 'none'
        event.toElement.style.opacity = '1'

        event.preventDefault()
        event.stopPropagation()

        window.URL = window.URL || window.webkitURL

        var files = event.dataTransfer.files
        if( files && files[0] ){
          var file = files[0]
          if( file.type === 'audio/mp3' || file.type === 'audio/wav' || file.type === 'audio/ogg' ){
            console.log( file )
            sequencer.addSample( window.URL.createObjectURL( file ), sampleId )

          }
        }
      }
    }

    document.querySelector( '#main' ).addEventListener( 'dragenter', 
      function( event ){
        document.querySelector( 'div#sample-buckets' ).style.display = 'block'
        event.preventDefault()
        event.stopPropagation()
        // e.dataTransfer.dropEffect = 'copy'
      }, false )
    document.querySelector('div#main').addEventListener( 'dragover', 
      function( event ){
        event.preventDefault()
        event.stopPropagation()
        console.log( event ) 
      }, false )
    document.querySelector('div#main').addEventListener( 'drop', 
      function( event ){
        event.preventDefault()
        event.stopPropagation()
        document.querySelector( 'div#sample-buckets' ).style.display = 'none'
        console.log( event ) 
      }, false )
    document.querySelector('div#sample-buckets div.buckets').addEventListener( 'dragleave', 
      function( event ){
        event.preventDefault()
        event.stopPropagation()
        document.querySelector( 'div#sample-buckets' ).style.display = 'none'
        console.log( event ) 
      }, false )
    

    tempoSlider = document.querySelector( 'li.tempo-slider div.track' )
    tempoSliderHandle = document.querySelector( 'li.tempo-slider div.track div.handle' )
    bpmText = document.querySelector( 'li.tempo-slider span.bpm' )

    tempoSlider.addEventListener( 'mousedown', function( event ){

      event.preventDefault()
      document.body.addEventListener( 'mousemove', tempoSliderMouseMoveHandler )
      window.addEventListener( 'mouseup', tempoSliderMouseUpHandler )

    })


    var updateBPM = underscore.throttle( function( value ) {
      var bpm = Math.round( 30 + ( 210 * value ))
      setBPM( bpm )
    }, 200 )

    function tempoSliderMouseMoveHandler ( event ){

      event.preventDefault()

      var tempoSliderX = tempoSlider.getBoundingClientRect().left,
          tempoSliderW = tempoSlider.offsetWidth,
          positionX = ( Math.max( Math.min( event.x - tempoSliderX, tempoSliderW ), 0 ) / tempoSliderW )

      updateBPM( positionX )

      tempoSliderHandle.style.left = ( ( positionX * 105 ) - 115 ) + 'px'

    }

    function tempoSliderMouseUpHandler( event ) {

      event.preventDefault()
      document.body.removeEventListener( 'mousemove', tempoSliderMouseMoveHandler )
      window.removeEventListener( 'mouseup', tempoSliderMouseUpHandler )

    }

    function tempoSliderTouchMoveHandler( event ) {

      event.preventDefault()
      setBPM( sequencer.bpm + ( ( tempoSliderX - event.changedTouches[ 0 ].clientX ) ) )

    }

    function tempoSliderTouchEndHandler( event ) {

      event.preventDefault()
      window.removeEventListener( 'touchmove', tempoSliderMouseMoveHandler )
      window.removeEventListener( 'touchend', tempoSliderTouchEndHandler )

    }

    function toggleShuffle(){

      shuffling = !shuffling
      if ( shuffling ){
        shuffleButton.classList.add( 'on' )
        shuffleStep = sequencer.getCurrentStep()
      }
      else{
        shuffleButton.classList.remove( 'on' )
      }

    }

    shuffleButton = document.querySelector( 'div#nav ul.controls li.shuffle-button' )
    shuffleButton.addEventListener( 'click', function( event ) {

      event.preventDefault()
      toggleShuffle()
      return
    })

    variationButton = document.querySelector( 'div#nav ul.controls li.variation-button' )
    variationButton.addEventListener( 'click', function( event ) {

      event.preventDefault()
      variationButton.classList.toggle( 'on' )
      variation = ( variationButton.classList.contains( 'on' ) ) ? 'b' : 'a'
      updateSteps()

    })

    var _resize = underscore.debounce( function(){
      resizeBackgroundGradient()
    }, 100)

    window.onresize = function( event ){
      _resize()
    }

    function resizeBackgroundGradient(){

      var w = width = window.innerWidth
      var h = height = window.innerHeight  // save old width/height

      cubeContainerHeight = cubeContainerHeightRatio * height

      backgroundCanvas.width = backgroundCanvas.height = 0  //set width/height to zero
      backgroundCanvas.width= w
      backgroundCanvas.height= h   //restore old width/height

    }


    // http://www.html5rocks.com/en/tutorials/pagevisibility/intro/
    function getHiddenProp(){

      var prefixes = ['webkit','moz','ms','o']
      
      // if 'hidden' is natively supported just return it
      if ('hidden' in document) return 'hidden'
      
      // otherwise loop over all the known prefixes until we find one
      for (var i = 0; i < prefixes.length; i++){
          if ((prefixes[i] + 'Hidden') in document) 
              return prefixes[i] + 'Hidden'
      }

      // otherwise it's not supported
      return null
    }

    var visProp = getHiddenProp()
    if (visProp) {
      var evtname = visProp.replace(/[H|h]idden/,'') + 'visibilitychange'
      document.addEventListener(evtname, visChange)
    }

    function isHidden() {

      var prop = getHiddenProp()
      if (!prop) return false
      
      return document[prop]

    }

    function visChange() {

      if (isHidden())
        sequencer.pause()
      else if( playing )
        sequencer.play()

    }

    function resetSteps(){
      
      console.log('reset')
      activeSteps = { a : {}, b : {} }
      updateSteps()
      
    }

    resetButton = document.querySelector( 'div#nav ul.controls li.reset-button' )
    resetButton.addEventListener( 'click', function( event ) {

      event.preventDefault()
      resetSteps()
      return

    })



    tapButton = document.querySelector( 'div#nav ul.controls li.tap-button' )

    function tapMouseOutHandler( event ) {

      tapButton.classList.remove( 'down' )

      return
    }

    tapButton.addEventListener('touchstart', 
      function(e){

        event.preventDefault()

        // event.preventDefault()
        var date = new Date(),
          time = date.getTime(),
          bpm = Math.round( ( 60 / ( time - tapTime ) ) * 1000 )
          if ( bpm > 30 && bpm < 350 ) {
            setBPM( bpm )
          }
        tapTime = time

        return

      })

    tapButton.addEventListener( 'mousedown', function( event ) {

      event.preventDefault()
      tapButton.classList.add( 'down' )
      tapButton.addEventListener( 'mouseout', tapMouseOutHandler )

      // event.preventDefault()
      var date = new Date(),
        time = date.getTime(),
        bpm = Math.round( ( 60 / ( time - tapTime ) ) * 1000 )
        if ( bpm > 30 && bpm < 350 ) {
          setBPM( bpm )
        }

      tapTime = time


      return
    } )

    tapButton.addEventListener( 'mouseup', function( event ) {

      event.preventDefault()
      tapButton.classList.remove( 'down' )
      tapButton.removeEventListener( 'mouseout', tapMouseOutHandler )

      return

    } )

    playButton = document.querySelector( 'div#nav ul.controls li.play-button' )
    playButton.addEventListener( 'click', function( event ) {

      event.preventDefault()

      if( isMobile && !mobileAudioStarted ){
        startMobileAudio()
      }

      if ( sequencer.playing ) {
        pause()
      } else {
        play()
      }

      return

    } )


    document.querySelector( 'div#about div.close-button' ).addEventListener( 'click', function( event ){

      document.querySelector( 'div#about').classList.remove( 'on' )

      return

    })

    document.querySelector( 'div.info-button' ).addEventListener( 'click', function( event ){

      document.querySelector( 'div#about').classList.add( 'on' )
      
      return

    })

    window.onkeypress = function(e){

      var e = window.event || e,
          keycode = e.charCode || e.keyCode

      if( ( keycode === 32 ) )

        if( sequencer.playing )

          pause()
        
        else
          
          play()

      else if ( ( keycode === 56 ) ) {

          if( sequencer.recording ){

            sequencer.stopRecording()

          }
          else{

            sequencer.startRecording()
          
          }

      }

      return 

    }

    window.onkeydown = function(e){

      var e = window.event || e,
          keycode = e.charCode || e.keyCode
      
      if ( keycode === 38 )

        sequencer.setPlaybackRate( Math.min( sequencer.getPlaybackRate() * 1.25, 4 ) )

      else if ( keycode === 40 )

        sequencer.setPlaybackRate( Math.max( sequencer.getPlaybackRate() * .875, .0625 ) )

      return 

    }

    setBPM( sequencer.bpm )

    ready = true

  }

  //http://css-tricks.com/snippets/javascript/get-url-variables/
  function getQueryVariable(variable){

     var query = window.location.search.substring(1)
     var vars = query.split("&")
     for (var i=0;i<vars.length;i++) {
             var pair = vars[i].split("=");
             if(pair[0] == variable){return pair[1]}
     }
     return(false)

  }

  //http://stackoverflow.com/questions/11381673/javascript-solution-to-detect-mobile-browser
  function detectmobile() { 

   if( navigator.userAgent.match(/Android/i)
   || navigator.userAgent.match(/webOS/i)
   || navigator.userAgent.match(/iPhone/i)
   || navigator.userAgent.match(/iPad/i)
   || navigator.userAgent.match(/iPod/i)
   || navigator.userAgent.match(/BlackBerry/i)
   || navigator.userAgent.match(/Windows Phone/i)
   ){
      return true;
    }
   else {
      return false;
    }

  }

  function detectAndroid(){
    var a = navigator.userAgent.match(/Android/i)
    return a

  }

  //http://stackoverflow.com/questions/5661671/detecting-transform-translate3d-support
  function has3d() {
    var el = document.createElement('p'), 
        has3d,
        transforms = {
            'webkitTransform':'-webkit-transform',
            'OTransform':'-o-transform',
            'msTransform':'-ms-transform',
            'MozTransform':'-moz-transform',
            'transform':'transform'
        }

    // Add it to the body to get the computed style.
    document.body.insertBefore(el, null);

    for (var t in transforms) {
        if (el.style[t] !== undefined) {
            el.style[t] = "translate3d(1px,1px,1px)";
            has3d = window.getComputedStyle(el).getPropertyValue(transforms[t]);
        }
      }

      document.body.removeChild(el);

      return (has3d !== undefined && has3d.length > 0 && has3d !== "none");
  }


  function parseURL(){

    var steps,
        s,
        r,
        bpm = getQueryVariable( 'bpm' )

    if( bpm )
      sequencer.setBPM( parseInt( bpm ) )

    underscore.each( ['a','b'], function( v ){

      underscore.each( cube.faces, function( f ){

        faceName = f.face.substring( 0, 1 )

        steps = getQueryVariable( faceName + v )

        if( steps ){
          s = steps.split( '' ) 

          r = {}
          underscore.each( steps, function( t ){

            r[ t ] = 1

          })

          if( s.length > 0 )
            activeSteps[ v ][ f.face ] = {
              face : f.face,
              steps : r,
              stepCount : s.length,
              sampleId : parseInt( getQueryVariable( faceName + 's' + v ) ) || 0
            }
        }

      })

    })

  }

  function createURL(){

    var url = 'bpm=' + sequencer.bpm + '&',
        faceName
    
    underscore.each( activeSteps, function( v, vk ){

      underscore.each( v, function( f ){

        faceName = f.face.substring( 0, 1 )

        url += ( faceName + 's' + vk + '=' + f.sampleId + '&' + faceName + vk + '=' )

        underscore.each( f.steps, function( s, sk ){
        
          if( s > 0 )
            url += sk 
        
        })

        url += '&'

      })

    })

    return url

  }




  function play() {

    playButton.classList.remove( 'play-button' )
    playButton.classList.add( 'pause-button' )
    sequencer.play()
    playing = true

  }

  function pause() {

    playButton.classList.remove( 'pause-button' )
    playButton.classList.add( 'play-button' )
    sequencer.pause()
    playing = false
  
  }

  function setBPM( value ) {

    var bpm = Math.round( Math.max( Math.min( value, 240 ), 30 ) )
    sequencer.setBPM( bpm )
    tempoSliderHandle.style.left = ( ( ( ( bpm - 30 ) / 210 ) * 105 ) - 115 ) + 'px'
    bpmText.innerHTML = bpm

    updateURLs()

  }

  function updateFaceElementList() {

    var list = [],
      cubeletFaceList = [],
      f,
      centerElement,
      stepStage

    drumCubeWrappers.forEach( function( drumCubeWrapper ) {
      if( !drumCubeWrapper.classList.contains( 'center' )){
        drumCubeWrapper.style.webkitTransform = 'scale3d(' + 1 + ',' + 1 + ',' + 1 + ') translate3d(' + 0 + 'px, ' + 0 + 'px, ' + 0 + 'px)'
        drumCubeWrapper.style.transform = 'scale3d(' + 1 + ',' + 1 + ',' + 1 + ') translate3d(' + 0 + 'px, ' + 0 + 'px, ' + 0 + 'px)'
      }
    })


    cube.faces.forEach( function( face ) {
      cubeletFaceList = []
      centerFaceName = face.cubelets[ 4 ][ face.name ].element.dataset.faceName

      for ( var i = 0; i < sequenceOrder.length; i++ ) {
        f = face.cubelets[ sequenceOrder[ i ] ][ face.name ]
        f.element.dataset[ 'stepId'] = String( i )
        f.element.classList.remove( 'triggered' )
        cubeletFaceList.push( f )
        stepStage = parseInt( f.element.dataset[ 'stepStage' + variation ] ) || 0
        setStepStage( centerFaceName, i, stepStage )
        swapDSCubeStyles( f.element, centerFaceName )
      }
      list.push( cubeletFaceList )
    })

    faceElementList = list

  }

  function setStepStage( faceName, stepId, stage ){

    if( ready ){

      //create face steps object if null
      if( !activeSteps[ variation ][ faceName ] )
        activeSteps[ variation ][ faceName ] = {
          face : faceName,
          steps : {},
          stepCount : 0,
          sampleId : sequencer.getSampleId( faceName.toUpperCase() )
        }

      //if step is on add to activeSteps and increase stepCount
      if( stage > 0 ){
        activeSteps[ variation ][ faceName ].steps[ stepId ] = stage
        activeSteps[ variation ][ faceName ].stepCount++
      }
      //if step was previously on delete from activeSteps and decrease stepCount
      else if ( activeSteps[ variation ][ faceName ].steps[ stepId ] > 0 ){
        delete activeSteps[ variation ][ faceName ].steps[ stepId ]
        activeSteps[ variation ][ faceName ].stepCount--

        //if there are no steps on face remove face steps object
        if( activeSteps[ variation ][ faceName ].stepCount < 1 )
          delete activeSteps[ variation ][ faceName ]
      }

      //update sequencer
      sequencer.setStep( faceName.toUpperCase(), stepId, stage, true )

      updateBackground()
      updateURLs()
    }

  }

  function updateStepElement( element, stage ){

    switch ( stage ) {
      case 1:
        element.classList.add( 'step-on' )
        break
      default:
        element.classList.remove( 'step-on' )
        break
    }

    element.dataset[ 'stepStage' + variation ] = stage

  }

  function getStepStage( faceName, stepId ){

    //return step stage from activeSteps or return 0 (1=on, 0 || null = off)
    return ( activeSteps[ variation ][ faceName ] != undefined )? activeSteps[ variation ][ faceName ].steps[ stepId ] || 0 : 0

  }

  function toggleStep( element ) {

    //get step stage from element's dataset (1=on, 0 || null = off)
    var stepStage =  getStepStage( element.dataset.faceName, element.dataset.stepId ) //parseInt( element.dataset[ 'stepStage' + variation ] )
    
    //toggle stepStage value
    switch ( stepStage ) {
      case 1:
        element.dataset[ 'stepStage' + variation ] = stepStage = 0
        break;
      default:
        element.dataset[ 'stepStage' + variation ] = stepStage = 1
    }

    updateStepElement( element, stepStage )

    //update activeSteps and sequencer
    setStepStage( element.dataset.faceName, element.dataset.stepId ,stepStage )

    updateBackground()
    updateURLs()

  }

  //update sequencer steps, samples and step elements from activeSteps
  function updateSteps(){

    var centerFaceName,
        f,
        stepId,
        sampleId,
        step,
        element

    cube.faces.forEach( function( face ){
      
      centerFaceName = face.cubelets[ 4 ][ face.name ].element.dataset.faceName

      if( activeSteps[ variation ][ centerFaceName ] )
        sampleId = activeSteps[ variation ][ centerFaceName ].sampleId
      else
        sampleId = 0

      //update track's sample selection
      sequencer.setSample( centerFaceName.toUpperCase(), sampleId )

      for ( var i = 0; i < sequenceOrder.length; i++ ) {

        f = face.cubelets[ sequenceOrder[ i ] ][ face.name ]
        stepId = parseInt( f.element.dataset[ 'stepId'] )

        if( activeSteps[ variation ][ centerFaceName ] ){

          step = activeSteps[ variation ][ centerFaceName ].steps[ stepId ]

        }
        else{

          step = 0
        
        }
        
        updateStepElement( f.element, step )

        sequencer.setStep( centerFaceName.toUpperCase(), stepId, step, true )

      }
    })


    updateSampleSelectionElements()

  }

  function updateSampleSelectionElements(){

    var centerFaceName,
        sampleElement,
        element,
        sampleId

    cube.faces.forEach( function( face ){

      //get center element
      element = face.cubelets[ 4 ][ face.name ].element

      //get centerFaceName (sequencer track Id) from element's dataset
      centerFaceName = element.dataset.faceName

      sampleElement = element.querySelector( 'div.sticker div.on' )

      //if a sample icon is selected turn it off
      if( sampleElement )
        sampleElement.classList.remove( 'on' )

      //get sampleId for sequencer's corresponding track
      sampleId = sequencer.tracks[ centerFaceName.toUpperCase() ].sampleId

      //turn on sample icon if one exists (secret samples do not have icons)
      sampleElement = face.cubelets[ 4 ][ face.name ].element.querySelector( '.sticker' ).children[ sampleId  + 1 ]
      if( sampleElement )
        sampleElement.classList.add( 'on' )

    })

  }

  //update activeSteps with step element datasets
  function updateActiveSteps(){

    if ( ready ){

      var centerFaceName,
          stepStage,
          stepCount,
          centerFaceName,
          steps = {},
          s,
          color,
          color2,
          c = {r:0, g:0, b:0}

      cube.faces.forEach( function( face ){

        //get centerFaceName (sequencer track Id) from element's dataset
        centerFaceName = face.cubelets[ 4 ][ face.name ].element.dataset.faceName

        //reset step count for this face
        stepCount = 0

        //object to store selected steps
        s = {}

        //loop through steps on cube face
        for ( var i = 0; i < sequenceOrder.length; i++ ) {

          //get step stage from activeSteps
          stepStage =  getStepStage( centerFaceName, i )

          //add active step and increase stepCount
          if ( stepStage > 0 ){

            s[ i ] = stepStage
            stepCount ++

          }
        }

        //add this face if it contains steps
        if( stepCount > 0 ){
        
          steps[ centerFaceName ] = {
            face : centerFaceName,
            steps : s,
            stepCount : stepCount,
            sampleId : sequencer.getSampleId( centerFaceName.toUpperCase() )
          }

        }
      })

      activeSteps[ variation ] = steps  

    }

    updateBackground()
    updateURLs()

  }

  //update background step visualization
  function updateBackground(){
    var centerFaceName,
        stepStage,
        stepCount,
        centerFaceName,
        orderedSteps = [],
        color,
        color2,
        c = {r:0, g:0, b:0}

    underscore.each( activeSteps[ variation ], function( face ){

      switch( face.face ){

        case 'front':
          color = 'hsla(57,87.4%,68.8%,.1)'
          color2 = 'hsla(57,87.4%,68.8%,0)'
          c = { r: 245,  g: 238,  b: 106}
          break

        case 'back':
          color = 'hsla(180,30.4%,95.5%,.1)'
          color2 = 'hsla(180,30.4%,95.5%,0)'
          c = { r: 240,  g: 240,  b: 247}
          break

        case 'up':
          color = 'hsla(12.7,54.1%,52.2%,.1)'
          color2 = 'hsla(12.7,54.1%,52.2%,0)'
          c = { r: 199,  g: 95,  b: 67}
          break

        case 'down':
          color = 'hsla(33.9,76.9%,64.3%,.1)'
          color2 = 'hsla(33.9,76.9%,64.3%,0)'
          c = { r: 234,  g: 173,  b: 94}
          break

        case 'left':
          color = 'hsla(152.9,46.7%,64.7%,.1)'
          color2 = 'hsla(152.9,46.7%,64.7%,0)'
          c = { r: 123,  g: 207,  b: 169}
          break

        case 'right':
          color = 'hsla(15.9,25.4%,37.8%,.1)'
          color2 = 'hsla(15.9,25.4%,37.8%,0)'
          c = { r: 121,  g: 85,  b: 72}
          break

      }

      orderedSteps.push({
        face : face.face,
        color : color,
        color2 : color2,
        c: c,
        stepCount : face.stepCount
      })

    })

    orderedSteps = underscore.sortBy( orderedSteps, function(obj){ return obj.stepCount }).reverse()

    tweenTime = ( shuffling ) ? 500 : 2000

    if( orderedSteps[ 0 ] ){
        haloTween.stop()
        haloTween = new TWEEN.Tween( haloColor )
          .to(orderedSteps[ 0 ].c, tweenTime)
          .easing(TWEEN.Easing.Quartic.InOut)
          .start()
    }
    if( orderedSteps[ 1 ] ){
      solidBGTween.stop()
      solidBGTween = new TWEEN.Tween( solidBGColor )
        .to(orderedSteps[ 1 ].c, tweenTime)
        .easing(TWEEN.Easing.Quartic.InOut)
        .start()
    }
    
  }

  //set canonical URL and make short URL request
  function updateURLs(){

    var url = createURL()

    canonicalURLElement.setAttribute( 'href', '?' + url )

    //throttle short URL updates to 4 sec
    if( shortURLUpdate )
      clearTimeout( shortURLUpdate )

    shortURLUpdate = setTimeout( function(){}, 4000 )

  }

  function startMobileAudio(){

    var oscillator = sequencer.audioContext.createOscillator()
    oscillator.connect( sequencer.audioContext.destination )
    oscillator.noteOn && oscillator.noteOn( 0 )
    oscillator.noteOff(0)
    mobileAudioStarted = true

  }

  function swapDSCubeStyles( element, faceName ) {

    var f = element.dataset.faceName
    if ( f ) 
      element.classList.remove( f )
    element.classList.add( faceName )
    element.dataset.faceName = faceName

  }

  function sampleLoadStartHandler( trackId ) {

    var centerFace = cube.faces[ trackId ].cubelets[ 4 ][ cube.faces[ trackId ].name ],
      stickerElement = centerFace.element.querySelector( '.sticker' )
    
    stickerElement.classList.add( 'loading' )

  }

  function sampleLoadCompleteHandler( trackId ) {

    var centerFace = window.cube.faces[ trackId ].cubelets[ 4 ][ cube.faces[ trackId ].name ],
      stickerElement = centerFace.element.querySelector( '.sticker' )

    if( !activeSteps[variation][ centerFace.element.dataset.faceName ])
      sequencer.tracks[ centerFace.element.dataset.faceName.toUpperCase() ].playSample( 0 )

    stickerElement.classList.remove( 'loading' )

  }

  function loop() {

    if ( ready === false && document.readyState === 'complete' ) {
      setup()
      if( !isMobile )
        play()
    }
    if ( ready ) {
      if( sequencer.playing )
        // meter.tick()
        sequencer.update()
        var step = sequencer.getCurrentStep()
        if ( step !== currentStep ) {

          for ( var i = 0; i < faceElementList.length; i++ ) {
            faceElementList[ i ][ currentStep ].element.classList.remove( 'triggered' )
            faceElementList[ i ][ step ].element.classList.add( 'triggered' )
            faceElementList[ i ][ currentStep ].element.dataset.triggered = 0
            faceElementList[ i ][ step ].element.dataset.triggered = 1
          }
          cube.cubelets.forEach( function( cubelet ) {
            var size = cubelet.size,
              offset,
              cubeletElement = document.querySelector( '.cubeletId-' + cubelet.id ),
              drumCubeWrapper = drumCubeWrappers[ cubelet.id ],
              p = new THREE.Vector3( 0, 0, 0 ),
              s = new THREE.Vector3( 1, 1, 1 )
              if( !drumCubeWrapper.classList.contains( 'center' ) ){
                cubelet.faces.forEach( function( face ) {
                  if ( face.element.classList.contains( 'faceExtroverted' ) ) {
                    sOffset = ( .05 * parseFloat( face.element.dataset.triggered ) || 0 )
                    normal = faceNormals[ cubelet.address ][ face.id ]
                    if ( activeSteps[ variation ][ face.element.dataset.faceName ] && activeSteps[ variation ][ face.element.dataset.faceName ].steps[ parseInt( face.element.dataset.stepId )] ) {
                      sOffset *= 10.0
                      pOffset = ( .35 * ( sOffset * size ) )
                    
                      // backgroundElement.style.webkitTransform = 'translate3d(-' + backgroundXMap[ face.normal ] + '%, 0, 0)'
                    }
                    else{

                      pOffset = ( .5 * ( sOffset * size ) )
                    }
                    if ( normal == 'right' ) {
                      s.x = 1 + sOffset
                      p.x += pOffset
                    } else if ( normal == 'left' ) {
                      s.x = 1 + sOffset
                      p.x -= pOffset
                    } else if ( normal == 'down' ) {
                      s.y = 1 + sOffset
                      p.y += pOffset
                    } else if ( normal == 'up' ) {
                      s.y = 1 + sOffset
                      p.y -= pOffset
                    } else if ( normal == 'front' ) {
                      s.z = 1 + sOffset
                      p.z += pOffset
                    } else if ( normal == 'back' ) {
                      s.z = 1 + sOffset
                      p.z -= pOffset
                    }
                  }
                } )
                
                drumCubeWrapper.style.webkitTransform = 'scale3d(' + s.x + ',' + s.y + ',' + s.z + ') translate3d(' + p.x + 'px, ' + p.y + 'px, ' + p.z + 'px)'
                drumCubeWrapper.style.transform = 'scale3d(' + s.x + ',' + s.y + ',' + s.z + ') translate3d(' + p.x + 'px, ' + p.y + 'px, ' + p.z + 'px)'
             
              }
          } )

          currentStep = step

          stepCount ++

        } 

        if( shuffling && ( step === shuffleStep || ( ( ( shuffleStep + step ) % 8 ) % 2 ) === 0 )) ///( step === ( shuffleStep + 4 ) % 8 ) === 0)
          cube.shuffle(1)
    
        var x = .5 * width,
            y = .5 * cubeContainerHeight,
            waveformData = new Uint8Array( 1 ),
            r = ( ( width > height ) ? width : height ) * 2,
            grd = canvasContext.createRadialGradient( x, y, r * .06, x, y, r * .4  )

        if( isAndroid ){
          grd.addColorStop( 1, 'rgba(' + Math.round( haloColor.r ) + ', ' + Math.round( haloColor.g ) + ', ' + Math.round( haloColor.b ) + ', 1)' )
          // grd.addColorStop( .75, 'rgba(' + Math.round( haloColor.r ) + ', ' + Math.round( haloColor.g ) + ', ' + Math.round( haloColor.b ) + ', 1)' )
          // grd.addColorStop( .05, 'rgba(' + Math.round( solidBGColor.r ) + ', ' + Math.round( solidBGColor.g ) + ', ' + Math.round( solidBGColor.b ) + ', 1)' )
          // grd.addColorStop( 1, 'rgba(' + Math.round( solidBGColor.r ) + ', ' + Math.round( solidBGColor.g ) + ', ' + Math.round( solidBGColor.b ) + ', 1)' )
        }
        else{
          grd.addColorStop( 0, 'rgba(' + Math.round( haloColor.r ) + ', ' + Math.round( haloColor.g ) + ', ' + Math.round( haloColor.b ) + ', 1)' )
          grd.addColorStop( .05, 'rgba(' + Math.round( haloColor.r ) + ', ' + Math.round( haloColor.g ) + ', ' + Math.round( haloColor.b ) + ', 1)' )
          grd.addColorStop( .70, 'rgba(' + Math.round( solidBGColor.r ) + ', ' + Math.round( solidBGColor.g ) + ', ' + Math.round( solidBGColor.b ) + ', 1)' )
          grd.addColorStop( 1, 'rgba(' + Math.round( solidBGColor.r ) + ', ' + Math.round( solidBGColor.g ) + ', ' + Math.round( solidBGColor.b ) + ', 1)' )
        }
        // sequencer.analyser.getByteTimeDomainData( waveformData )

        // grd.addColorStop( .75, 'rgba(0,0,0, 1)' )
        // grd.addColorStop( 1, 'rgba(0,0,0, 1)' )

        canvasContext.fillStyle = grd
        canvasContext.fillRect(0, 0, width, height)

    }

    TWEEN.update()
    
    requestAnimationFrame( loop )
  }

  requestAnimationFrame( loop )

} )();

