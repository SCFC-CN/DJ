DrumTrack = function ( audioContext, gain, params){
  
  var params = params || {}
  
  this.audioContext = audioContext


  this.masterGain = gain

  this.gain = this.audioContext.createGain()
  this.gain.connect( this.masterGain )

  this.steps = [ 0, 0, 0, 0, 0, 0, 0, 0 ]

  this.sampleCollectionURLs = params.sampleCollectionURLs || {}

  this.sampleId = -1

  this.loadedBuffers = {}

  this.bufferSource = null

  this.trackId = params.trackId

  this.trackName = params.trackName || ''

  this.sampleLoadStartCallback = params.sampleLoadStartCallback || null
  this.sampleLoadCompleteCallback = params.sampleLoadCompleteCallback || null

  this.cycleSample()

  this.previousStep = -1

  this.bufferSourceList = {}

  this.playbackRate = 1

}

DrumTrack.prototype.cancelStep = function( stepId ){

  if ( this.bufferSourceList[ stepId ] ){

      // this.bufferSourceList[ stepId ].disconnect( this.gain )
      this.bufferSourceList[ stepId ].disconnect()
      delete this.bufferSourceList[ stepId ]
    
    }

}

DrumTrack.prototype.playSample = function( time ){

  var buffer = this.getBuffer(),
      bufferSource = this.audioContext.createBufferSource()

  if( buffer ){
    
    bufferSource.buffer = buffer
    bufferSource.connect( this.gain )
    
    this.gain.gain.setValueAtTime( 0, time )
    this.gain.gain.linearRampToValueAtTime( 1.0, time + .003 )
    
    bufferSource.start( time )
    bufferSource.playbackRate.setValueAtTime( this.playbackRate, time )

  }
  
  return bufferSource

}

DrumTrack.prototype.cycleSample = function(){

  var id =  ( this.sampleId + 1 ) % ( this.sampleCollectionURLs.length )
  this.loadSample( id )

}

DrumTrack.prototype.setSample = function( id ){

  this.sampleId =  id
  this.loadSample( id )

}

DrumTrack.prototype.setSteps = function( array ){

  if( array && array.length === this.steps.length ) 
    this.steps = array

}

DrumTrack.prototype.setStep = function( stepId, value ){

 this.steps[ stepId ] = value

}


DrumTrack.prototype.scheduleStep = function( time, stepId ){

  this.cancelStep( stepId )


  if( this.steps[ stepId ] > 0 ){

    if( this.bufferSourceList[ this.previousStep ] )
      try{
        this.gain.gain.setValueAtTime( 1, time - .01 )
        this.gain.gain.linearRampToValueAtTime( 0, time )
        this.bufferSourceList[ this.previousStep ].stop( time )
      }
      catch( error ) {

      }

    this.bufferSourceList[ stepId ] = this.playSample( time )
    this.previousStep = stepId

  }
}

DrumTrack.prototype.setPlaybackRate = function( value ){

  this.playbackRate = value

  this.bufferSourceList[ this.previousStep ].playbackRate.setValueAtTime( value, this.audioContext.currentTime )

}

DrumTrack.prototype.getBuffer = function(){

  return this.loadedBuffers[ this.sampleId ]

}

DrumTrack.prototype.loadSample = function( id ){

  this.sampleId = id

  if( this.loadedBuffers[ id ] ){

    this.buffer = this.loadedBuffers[ id ]
    return

  }

  var url = this.sampleCollectionURLs[ id ],
      _this = this
  
  if( url ){

    if( this.sampleLoadStartCallback )
      this.sampleLoadStartCallback( this.trackId )
    var request = new XMLHttpRequest()
    request.open( 'GET', url, true )
    request.responseType = 'arraybuffer'

    request.onload = function() { 
      _this.audioContext.decodeAudioData( request.response, function( buffer ) {
        _this.loadedBuffers[ id ] = buffer
        if( _this.sampleLoadCompleteCallback ) 
          _this.sampleLoadCompleteCallback( _this.trackId )
      }, function( error ){
        console.log( error )
      })
    }

    request.send()

  }
  
}