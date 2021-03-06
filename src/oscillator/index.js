import _ from 'lodash'
import Core from '../core'
import ERRORS from '../errors.js'
import {CONTEXT, PI, TWOPI, SAMPLERATE} from '../constant'

/**
 * Oscillator
 * @param {Object={}} props Parameter object for Oscillator class
 * @param {number=0} type Index of waveform
 * @param {freq=440} freq Frequency in Hertz
 * @param {gain=0} gain Level of output
 * @param {phase=0} phase Phase in radian
 * @param {offset=0} offset Offset to frequency in Hertz
 */
class Oscillator extends Core {
  constructor (props = {}) {
    super(props)

    this.setType(props.type)
    this.setFreq(props.freq)
    this.setGain(props.gain)
    this.setPhase(props.phase)
    this.offset = props.offset || 0
    this.sync = props.sync
    this.mod = props.mod
    this.retrig = props.retrig

    /* istanbul ignore next */
    if (CONTEXT) {
      this.processor = CONTEXT.createScriptProcessor(1024)
      this.processor.onaudioprocess = this.process.bind(this)

      this.input = CONTEXT.createChannelMerger(10)

      if (this.retrig && this.retrig.processor) {
        this.retrig.processor.connect(this.input)
      }

      if (this.mod && this.mod.output) {
        this.mod.processor.connect(this.input)
      } else {
        CONTEXT.createChannelMerger(1).connect(this.input)
      }

      this.input.connect(this.processor)
      this.output = CONTEXT.createGain()
      this.output.gain.value = this.gain

      this.processor.connect(this.output)
    }
  }

  update () {
    this.processor.onaudioprocess = this.process.bind(this)
  }

  setType (type) {
    this.type = type || 0
    switch (this.type) {
      case 0:
        this.initialPhase = 0
        this.callback = this.getSineTick
        break
      case 1:
        this.initialPhase = 0
        this.callback = this.getTriTick
        break
      case 2:
        this.initialPhase = 0
        this.callback = this.getSawtoothDTick
        break
      case 3:
        this.initialPhase = 0
        this.callback = this.getSawtoothUTick
        break
      case 4:
      default:
        this.initialPhase = 0
        this.callback = this.getSquareTick
        break
    }
  }

  setFreq (freq) {
    if (freq <= 0) {
      this.freq = 440
      throw new Error(ERRORS.invalidFreq)
    } else {
      this.freq = freq || 440
      console.log(this.freq)
    }
  }

  setGain (gain) {
    if (gain < 0) {
      this.gain = 0
      throw new Error(ERRORS.invalidGain)
    } else {
      this.gain = gain || 0
    }
  }

  setPhase (phase) {
    this.phase = phase || 0
  }

  /**
   * reset - reset phase
   */
  reset () {
    this.phase = this.initialPhase
    // this.freq = this.props.freq
  }

  /* istanbul ignore next */
  process (event) {
    var inputArray1 = event.inputBuffer.getChannelData(0)
    var inputArray2 = event.inputBuffer.getChannelData(1)
    var outputArray = event.outputBuffer.getChannelData(0)
    var bufferSize = outputArray.length

    for (this.i = 0; this.i < bufferSize; this.i++) {
      outputArray[this.i] = this.callback(0)

      if (inputArray1[this.i] > 0) {
        this.phase = this.initialPhase
      }


      this.phase += (this.getPhaseIncrement((this.mod ? (inputArray1[this.i] * this.mod.gain) + this.freq : 0) + this.offset))

      // if (this.synced) {
      //
      //   if (this.synced.phase == 0) {
      //     // console.log(this.type, 'rest')
      //     this.reset()
      //   }
      // }
      //
      // if (this.callback(0) == 1) {
      //   if (this.sync) {
      //     this.sync.reset()
      //   }
      // }
      //
      //

      if (this.phase >= TWOPI) {
        this.reset()
      }

    }
  }

  getSineTick (phase) {
    return Math.sin(this.phase + phase)
  }

  getSquareTick (phase) {
    if ((this.phase + phase) <= PI) {
      return 1
    }
    return -1
  }

  getSawtoothUTick (phase) {
    // let val = ((this.phase + phase) * (1.0 / TWOPI))

    // if ((this.phase + phase) <= PI) {
    //   return -val
    // } else {
    //   return 1 - val
    // } 

    let val = (2 * ((this.phase + phase) * (1.0 / TWOPI))) - 1.0

    if (val <= PI) {
      val = 1 - val
    }

    return val

  }

  getSawtoothDTick (phase) {
    let val = ((this.phase + phase) * (1.0 / TWOPI))
    // 1.0 - 2 * ((this.phase + phase) * (1.0 / TWOPI))

    return 1.0 - 2 * ((this.phase + phase) * (1.0 / TWOPI))
  }

  getTriTick (phase) {
    let val = (2 * ((this.phase + phase) * (1.0 / TWOPI))) - 1.0
    /* istanbul ignore next */
    if (val < 0.0) {
      val = -val
    }
    val = 2.0 * (val - 0.5)
    return val
  }

  getPhaseIncrement (freq = 0) {
    return (TWOPI * (this.freq + freq)) / SAMPLERATE
  }

  wrap () {
    /* istanbul ignore next */
    if (this.phase > 1) {
      this.reset()
    }
  }
}

export default Oscillator
