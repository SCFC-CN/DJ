DrumSequencer = function( params ){

  window.AudioContext = window.AudioContext || window.webkitAudioContext
  
  var params = params || {},
      _this = this

  this.playing = false
  
  this._time  = new Date()
  this._startTime = this._time.getTime()

  this.tracks = {}
  this.trackNames = params.trackNames || [ 'FRONT', 'UP', 'RIGHT', 'DOWN', 'LEFT', 'BACK' ]
  this.trackTitles = params.trackNames || [ 'BassDrum', 'SnareDrum', 'Percussion', 'HiHat', 'Cymbal', 'CowBell' ]


  this._currentStep = 0
  this._currentBufferedStep = 0
  this._audioStarted = false

  this.recording = false

  this.sampleLocation = 'media/'
  this.sampleCollectionURLs = params.sampleURLs || 
  [
    //Bass Drum
    [
      '808_BD_1.wav',
      '808_BD_2.wav',
      '808_BD_3.wav'
    ],
    //Snare Drum
    [
      '808_SD_1.wav',
      '808_SD_2.wav',
      '808_SD_3.wav',
      '808_SD_4.wav',
    ],
    //Clap
    [
      '808_CP.wav',
      '808_CL.wav',
      '808_MR.wav',
      '808_RS_1.wav',
      '808_RS_2.wav',
    ],
    //Highhat
    [
      '808_OH_1.wav',
      '808_OH_2.wav',
      '808_CH_1.wav',
      '808_CH_2.wav',
    ],
    //Cymbal
    [
      '808_CY_3.wav',
      '808_CY_2.wav',
      '808_CY_1.wav'
    ],
    //Cowbell
    [
      '808_CB_1.wav',
      '808_CB_2.wav',
      '808_CB_3.wav'
    ]
  ]

  //full sample path
  underscore.each( this.sampleCollectionURLs, function( array, i ){
    underscore.each( array, function( url, j ){
      _this.sampleCollectionURLs[ i ][ j ] = _this.sampleLocation + url
    })
  })

  this._trackCount = params.trackCount  || 6
  this._stepCount = params.stepCount || 8

  this._timerId = 0

  this.audioContext = params.audioContext || new AudioContext()
  // Create a gain node.
  this.masterGain = this.audioContext.createGain()
  this.masterGain.gain.value = 0
  this.masterGain.connect( this.audioContext.destination )
  this.masterGain.gain.setValueAtTime( 1, 1)

  // this.analyser =  this.audioContext.createAnalyser()
  // this.masterGain.connect( this.analyser )

  this.bpm = 120
  this.stepDuration = ( 60 / ( this.bpm * 2 ) )
  this.lookAheadTime = ( this.stepDuration )

  this.selectedTrack = 'UP'

  this._nextBeatTime = 0.0
  
  var _this = this

  setupTracks.call( this )

  window.URL = window.URL || window.webkitURL
  navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia



  function setupTracks(){

    for( var i = 0; i < this._trackCount; i++ ){

      this.tracks[ this.trackNames[ i ] ] = 
      new DrumTrack(
        this.audioContext,
        this.masterGain,
        {
          trackId: i,
          trackName: _this.trackNames[ i ],
          sampleCollectionURLs: this.sampleCollectionURLs[ i ],
          sampleLoadStartCallback: params.sampleLoadStartCallback || null,
          sampleLoadCompleteCallback: params.sampleLoadCompleteCallback || null
        } 
      )
    }
  }
}

DrumSequencer.prototype.stopRecording = function (){

  var _this = this
  if( this.recording ){
    console.log('stop')
    this.recorder.stop()
    this.recording = false
  
    this.recorder.exportWAV( function(s) {
  
      _this.tracks[ _this.selectedTrack ].sampleCollectionURLs.push( window.URL.createObjectURL( s ) )
      _this.setSample( _this.selectedTrack, _this.tracks[ _this.selectedTrack ].sampleCollectionURLs.length - 1 )
  
    })
  }
}

DrumSequencer.prototype.startRecording = function (){

console.log( 'start' )
  var _this = this

  if ( this.recorder && this.recorder.recording )
    this.stopRecording()

  if ( navigator.getUserMedia ) {

    navigator.getUserMedia( { audio: true }, function( s ){

       var mediaStreamSource = _this.audioContext.createMediaStreamSource( s )
        _this.recorder = new Recorder( mediaStreamSource )
        _this.recorder.node.addEventListener( 'onaudioprocess', function(e){
          console.log('got it')
        })
        _this.recorder.record()
        _this.recording = true

    }, 
    function( event ){
      console.log( 'recording failed ')
    })

  } else {
    console.log( 'navigator.getUserMedia not present' )
  }

}

DrumSequencer.prototype.addSample = function ( url, trackId ){
  
  this.tracks[ trackId ].sampleCollectionURLs.push( url )
  this.setSample( trackId, this.tracks[ trackId ].sampleCollectionURLs.length - 1 )
  
}

DrumSequencer.prototype.setPlaybackRate = function( value ){

  this.tracks[ this.selectedTrack ].setPlaybackRate( value )

}

DrumSequencer.prototype.getPlaybackRate = function( value ){

  return this.tracks[ this.selectedTrack ].playbackRate

}

DrumSequencer.prototype.setBPM = function ( value ){

  // this._stepOffset = this.getCurrentStep()
  // this._timeOffset = this.audioContext.currentTime

  this.bpm = value
  this.stepDuration = ( 60 / ( value * 2) )
  this.lookAheadTime = ( this.stepDuration )

  this._rescheduleSteps()

}

DrumSequencer.prototype.getCurrentStep = function (){

  // var step = Math.floor( ( ( ( this.getCurrentTime() )  / this.stepDuration ) + this._stepOffset ) % this._stepCount )
  // return step

  return this._currentStep

}


DrumSequencer.prototype.getCurrentTime = function (){
  // var time
  // if( this.audioContext.currentTime ){
  //   time = this.audioContext.currentTime - this._timeOffset
  //   console.log('ac')
  // }
  // else{
  //   time = this._time.getTime() - this._timeOffset
  //   console.log('t')
  // }
  var time = ( ( this.audioContext.currentTime || ( this._time.getTime() - this._startTime ) ) )
  // console.log( time )
  return time

}

DrumSequencer.prototype.cancelBeats = function (){

  var _this = this

  underscore.each( this.tracks, function( track ){

    for( var i = 0; i < track.steps.length; i++ ){

      track.cancelStep( i )

    }

  })

}

DrumSequencer.prototype._queueBeats = function (){

    var _this = this
    while( this.bufferedTime < ( this.getCurrentTime() + this.lookAheadTime ) ){

      underscore.each( this.tracks, function( track ){
        
        track.scheduleStep( _this.bufferedTime, _this._currentBufferedStep )
        // console.log(_this.bufferedTime, _this.getCurrentStep(), currentBufferedStep, _this.lookAheadTime, _this.stepDuration, _this.getCurrentTime())
      })


      this.bufferedTime += this.stepDuration
      this._currentBufferedStep = ( this._currentBufferedStep + 1 ) % 8

    }

    this._timerId = window.setTimeout( function(){
      _this._queueBeats()
    }, _this.stepDuration * 100 )

}

DrumSequencer.prototype.cycleSample = function ( trackId ){

  this.tracks[ trackId ].cycleSample()
  this.selectedTrack = trackId

}

DrumSequencer.prototype.playSample = function ( trackId, sampleId ){

  this.tracks[ trackId ].playSample( sampleId )

}

DrumSequencer.prototype.setSample = function( trackId, sampleId ){

  this.tracks[ trackId ].setSample( sampleId )

  this.selectedTrack = trackId

}

DrumSequencer.prototype.getSampleId = function( trackId ){

  var sampleId = this.tracks[ trackId ].sampleId
  return sampleId

}

DrumSequencer.prototype.setStep = function( trackId, stepId, value, immediate ){

  this._audioStarted = true

  // if( immediate ){

  //   this.bufferedTime = this.getCurrentTime() + this.stepDuration
  //   this._currentBufferedStep = ( this.getCurrentStep() + 1 ) % 8
    
  // }

  this.tracks[ trackId ].setStep( stepId, value )

  if( immediate )
    this.selectedTrack = trackId

}

DrumSequencer.prototype.play = function(){

  this._rescheduleSteps()

  this._queueBeats()
  this.playing = true

}

DrumSequencer.prototype._rescheduleSteps = function(){

  this._nextBeatTime = this.getCurrentTime() + this.stepDuration
  this.cancelBeats()
  this.bufferedTime = this.getCurrentTime()
  this._currentBufferedStep = this.getCurrentStep()

}

DrumSequencer.prototype.pause = function(){

  this.playing = false
  this.cancelBeats()
  window.clearTimeout( this._timerId )

}

DrumSequencer.prototype.update = function(){

  if( this.playing && this.getCurrentTime() > this._nextBeatTime ){

    this._currentStep = ( this._currentStep + 1 ) % 8
    this._nextBeatTime += this.stepDuration

  }

}

