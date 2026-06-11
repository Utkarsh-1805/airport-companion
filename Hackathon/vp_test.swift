import AVFoundation
import Foundation

let engine = AVAudioEngine()
let inputNode = engine.inputNode
let outputNode = engine.outputNode
let playerNode = AVAudioPlayerNode()

engine.attach(playerNode)
let hwFormat = outputNode.outputFormat(forBus: 0)
engine.connect(playerNode, to: engine.mainMixerNode, format: hwFormat)

do {
    try inputNode.setVoiceProcessingEnabled(true)
    print("Enabled voice processing")
} catch {
    print("Could not enable: \(error)")
}

let inputFormat = inputNode.outputFormat(forBus: 0)
inputNode.installTap(onBus: 0, bufferSize: 1024, format: inputFormat) { buffer, _ in
    // nothing
}

do {
    try engine.start()
    print("Engine started successfully")
} catch {
    print("Engine failed to start: \(error)")
}
