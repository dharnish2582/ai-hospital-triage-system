import { useEffect, useState } from "react";

export function DecisionReplayTimeline() {

  const [timeline,setTimeline] = useState([]);
  const [step,setStep] = useState(0);
  const [playing,setPlaying] = useState(false);

  useEffect(()=>{

    fetch("/api/replay-timeline")
      .then(res=>res.json())
      .then(data=>setTimeline(data.timeline))

  },[])

  useEffect(()=>{

    if(!playing) return

    const interval = setInterval(()=>{
      setStep(s=>{
        if(s < timeline.length-1) return s+1
        return s
      })
    },1000)

    return ()=>clearInterval(interval)

  },[playing,timeline])

  return (

    <div className="glass-card p-4">

      <h3 className="font-semibold mb-3">
        AI Decision Replay
      </h3>

      <input
        type="range"
        min="0"
        max={timeline.length-1}
        value={step}
        onChange={(e)=>setStep(Number(e.target.value))}
        className="w-full"
      />

      <div className="flex gap-3 mt-3">

        <button
          onClick={()=>setPlaying(true)}
          className="px-3 py-2 bg-green-500 text-white rounded"
        >
          Play
        </button>

        <button
          onClick={()=>setPlaying(false)}
          className="px-3 py-2 bg-red-500 text-white rounded"
        >
          Pause
        </button>

      </div>

      <div className="mt-4 text-sm text-gray-600">

        {timeline[step]?.message}

      </div>

    </div>

  )
}