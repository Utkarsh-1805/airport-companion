import AVFoundation
import Foundation

func stderr(_ message: String) {
    if let data = (message + "\n").data(using: .utf8) {
        FileHandle.standardError.write(data)
    }
}

func fail(_ message: String) -> Never {
    stderr(message)
    exit(1)
}

let args = CommandLine.arguments
guard args.count >= 4,
      let inputRate = Double(args[1]),
      let inputChunkFrames = Int(args[2]),
      let outputRate = Double(args[3]) else {
    fail("Usage: macos_duplex_stream.swift <input_rate> <input_chunk_frames> <output_rate>")
}

let permissionSemaphore = DispatchSemaphore(value: 0)
var microphoneAllowed = false

AVCaptureDevice.requestAccess(for: .audio) { allowed in
    microphoneAllowed = allowed
    permissionSemaphore.signal()
}
permissionSemaphore.wait()

guard microphoneAllowed else {
    fail("Microphone permission denied.")
}

let engine = AVAudioEngine()
let inputNode = engine.inputNode
let outputNode = engine.outputNode
let playerNode = AVAudioPlayerNode()
engine.attach(playerNode)

let inputFormat = inputNode.outputFormat(forBus: 0)
guard let targetInputFormat = AVAudioFormat(
    commonFormat: .pcmFormatInt16,
    sampleRate: inputRate,
    channels: 1,
    interleaved: true
) else {
    fail("Could not create target input audio format.")
}

guard let inputConverter = AVAudioConverter(from: inputFormat, to: targetInputFormat) else {
    fail("Could not create input audio converter.")
}

guard let playerFormat = AVAudioFormat(
    commonFormat: .pcmFormatFloat32,
    sampleRate: outputRate,
    channels: 1,
    interleaved: false
) else {
    fail("Could not create player format.")
}

engine.connect(playerNode, to: engine.mainMixerNode, format: playerFormat)

do {
    try inputNode.setVoiceProcessingEnabled(true)
    stderr("Voice processing (AEC) successfully enabled.")
} catch {
    stderr("Warning: Could not enable voice processing: \(error.localizedDescription)")
}

let bytesPerChunk = inputChunkFrames * MemoryLayout<Int16>.size
let stdout = FileHandle.standardOutput
let writeLock = NSLock()
var pendingInputData = Data()

inputNode.installTap(onBus: 0, bufferSize: 1024, format: inputFormat) { buffer, _ in
    let ratio = inputRate / inputFormat.sampleRate
    let frameCapacity = AVAudioFrameCount(max(1, Int(Double(buffer.frameLength) * ratio) + 32))

    guard let converted = AVAudioPCMBuffer(pcmFormat: targetInputFormat, frameCapacity: frameCapacity) else { return }

    var alreadyProvidedInput = false
    var conversionError: NSError?

    let status = inputConverter.convert(to: converted, error: &conversionError) { _, outStatus in
        if alreadyProvidedInput {
            outStatus.pointee = .noDataNow
            return nil
        }
        alreadyProvidedInput = true
        outStatus.pointee = .haveData
        return buffer
    }

    guard status != .error else { return }

    let audioBuffer = converted.audioBufferList.pointee.mBuffers
    guard let dataPointer = audioBuffer.mData else { return }
    let byteCount = Int(audioBuffer.mDataByteSize)
    guard byteCount > 0 else { return }

    writeLock.lock()
    pendingInputData.append(Data(bytes: dataPointer, count: byteCount))
    while pendingInputData.count >= bytesPerChunk {
        stdout.write(pendingInputData.prefix(bytesPerChunk))
        pendingInputData.removeFirst(bytesPerChunk)
    }
    writeLock.unlock()
}

do {
    try engine.start()
    playerNode.play()
} catch {
    fail("Could not start engine: \(error.localizedDescription)")
}

stderr("Duplex stream ready.")

let stdin = FileHandle.standardInput

DispatchQueue.global(qos: .userInitiated).async {
    while true {
        let headerData = stdin.readData(ofLength: 4)
        if headerData.count == 0 {
            exit(0)
        }
        if headerData.count < 4 { continue }
        
        if headerData == "PLAY".data(using: .utf8) {
            let sizeData = stdin.readData(ofLength: 4)
            if sizeData.count < 4 { continue }
            let size = sizeData.withUnsafeBytes { $0.load(as: UInt32.self) }
            
            var audioData = Data()
            var bytesLeft = Int(size)
            while bytesLeft > 0 {
                let chunk = stdin.readData(ofLength: bytesLeft)
                if chunk.isEmpty { break }
                audioData.append(chunk)
                bytesLeft -= chunk.count
            }
            
            if audioData.count == Int(size) {
                let frameCount = AVAudioFrameCount(audioData.count / MemoryLayout<Int16>.size)
                guard let pcmBuffer = AVAudioPCMBuffer(pcmFormat: playerFormat, frameCapacity: frameCount) else { continue }
                pcmBuffer.frameLength = frameCount
                
                let floatChannelData = pcmBuffer.floatChannelData![0]
                audioData.withUnsafeBytes { rawBufferPointer in
                    let int16Pointer = rawBufferPointer.bindMemory(to: Int16.self).baseAddress!
                    for i in 0..<Int(frameCount) {
                        floatChannelData[i] = Float(int16Pointer[i]) / 32768.0
                    }
                }
                
                playerNode.scheduleBuffer(pcmBuffer, completionHandler: nil)
            }
            
        } else if headerData == "FLSH".data(using: .utf8) {
            playerNode.stop()
            playerNode.play()
        }
    }
}

RunLoop.current.run()
