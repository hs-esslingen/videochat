class VoiceMeterProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.once = 0;
    this.active = 1000;
  }

  static get parameterDescriptors() {
    return [
      {
        name: 'volumeLevel',
        defaultValue: 0.9,
        minValue: 0,
        maxValue: 1,
      },
    ];
  }

  // eslint-disable-next-line no-unused-vars
  process(inputs, outputs, parameters) {
    const volumeLevel = parameters.volumeLevel;
    let max = 0;
    for (let i = 0; i < inputs.length; i++) {
      for (let j = 0; j < inputs[i].length; j++) {
        for (let k = 0; k < inputs[i][j].length; k++) {
          if (inputs[i][j][k] > max) max = inputs[i][j][k];
          outputs[i][j][k] = inputs[i][j][k];
        }
      }
    }
    if (max < volumeLevel && this.active > 100) {
      for (let i = 0; i < inputs.length; i++) {
        for (let j = 0; j < inputs[i].length; j++) {
          for (let k = 0; k < inputs[i][j].length; k++) {
            outputs[i][j][k] = 0;
          }
        }
      }
    }
    if (this.active === 100) {
      console.log('disable');
    }
    if (max > volumeLevel) this.active = 0;
    this.active++;
    this.once++;
    return true;
  }
}

registerProcessor('voice-meter-processor', VoiceMeterProcessor);
