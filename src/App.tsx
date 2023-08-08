import { useRef, useState, memo, useMemo } from 'react';
import delay from 'delay';
import Queue from 'p-queue';
import { theLift, OnChangeProp } from './algoritm';
import './App.css';

const passengers = [[], [6, 5, 2], [4], [], [0,0,0], [], [], [3,6,4,5,6], [], [1,10,2], [1,4,3,2]];

const Floors = memo(({ passengers, active, title }: { passengers: number[][], active?: number, title: string }) => {
  return (
    <div className="floors">
      <div className="floors-title">{title}</div>
      <div className="floors-floors">
        {passengers.map((list, index) => <div className={`floor ${active === index ? 'floor_active' : ''}`} key={index}>{list.join(',')}</div>)}
      </div>
    </div>
  )
});

const Lift = memo(({ currentFloor, activePassengers, passengers, deliveredPassengers, waitingPassengers }: { passengers: number[][]; currentFloor: number; activePassengers: number[]; deliveredPassengers: number[][]; waitingPassengers: number[][]; }) => {
  const liftPassengers = [...passengers].map((_, index) => index === currentFloor ? activePassengers : []);
  const floors = passengers.map((_, index) => [index]);
  const waiting = waitingPassengers
  const delivered = deliveredPassengers
  return (
    <div className="lift">
      <Floors passengers={floors} title="floors" />
      <Floors passengers={delivered} title="delivered" />
      <Floors passengers={liftPassengers} active={currentFloor} title="lift" />
      <Floors passengers={waiting} title="waiting" />
    </div>
  )
})

function App() {
  const queueRef = useRef(new Queue({concurrency: 1}));
  const [state, setState] = useState<OnChangeProp>()
  const addToQueue = (props: OnChangeProp) => {
    queueRef.current.add(() => {
      setState(props);
    })
    queueRef.current.add(() => delay(2000));
  };
  const onChange = (props: OnChangeProp) => {
    addToQueue(props)
  };
  const runFirstTest = () => {
    theLift(
      structuredClone(passengers),
      3,
      onChange,
    );
  };
  
  return (
    <div className="App">
      {!state && <button onClick={runFirstTest}>run test</button>}
      {!!state && <Lift passengers={passengers} activePassengers={state.activePassengers} currentFloor={state.currentFloor} deliveredPassengers={state.deliveredPassengers} waitingPassengers={state.waitingPassengers} />}
    </div>
  );
}

export default App;
