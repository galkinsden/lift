class Queue<T> {
  private elements: T[];

  public constructor(elements?: T[]) {
    this.elements = elements || [];
  }

  public enqueue(value: T | T[]): Queue<T> {
    if (Array.isArray(value)) {
      value.forEach((val) => {
        this.elements.push(val);
      })
    } else {
      this.elements.push(value);
    }
    return this;
  }

  public dequeue(value?: T | ((value: T) => boolean)): T | undefined {
    if (!value) return this.elements.shift();
    return this.dequeueFirstOccurrence(value);
  }

  public remove(value: T): T[] {
    const removed = [] as T[];
    this.elements = this.elements.filter((element) => {
      if (element === value) {
        removed.push(element);
        return false;
      }
      return true;
    });
    return removed;
  }
  
  public every(condition: ((value: T) => boolean)): boolean {
    return this.elements.every(condition);
  }

  public get size(): number {
    return this.elements.length;
  }

  public has(condition: T | ((value: T) => boolean)): boolean {
    if (typeof condition === 'function') {
      return this.elements.some(condition as (value: T) => boolean);
    }
    return this.elements.includes(condition);
  }

  public get(index: number): T | undefined {
    return this.elements[index];
  }

  private dequeueFirstOccurrence(value: T | ((value: T) => boolean)): T | undefined {
    if (typeof value === 'function') {
      return this.dequeueFirstOccurrenceByCondition(value as ((value: T) => boolean));
    }
    return this.dequeueFirstOccurrenceByValue(value);
  }
  
  private dequeueFirstOccurrenceByValue(value: T): T | undefined {
    const index = this.elements.indexOf(value);
    if (index !== -1) {
      const items = this.elements.splice(index, 1);
      return items?.[0];
    }
    return undefined;
  }
  
  private dequeueFirstOccurrenceByCondition(condition: ((value: T) => boolean)): T | undefined {
    const index = this.elements.findIndex(condition);
    if (index !== -1) {
      const items = this.elements.splice(index, 1);
      return items?.[0];
    }
    return undefined;
  }

  public get list(): T[] {
    return this.elements;
  }
}

export type Queues = Map<number, Queue<number>>;

export type OnChangeProp = { currentFloor: number, maxFloor: number; floorHistory: number[]; activePassengers: number[]; deliveredPassengers: number[][]; waitingPassengers: number[][]; };

export type OnChange = (props: OnChangeProp) => void;

class Lift {
  private readonly waitingPassengers: Queues;
  private readonly capacity: number;
  private readonly passengers: Queue<number>;
  private readonly maxFloor: number;
  private goUp: boolean;
  private currentFloor: number;
  public readonly floorHistory: number[];
  private readonly onChange: OnChange;
  private readonly deliveredPassengers: Queues;

  public constructor(queues: number[][], capacity: number, onChange: OnChange) {
    this.waitingPassengers = this.createWaitingPassengersQueues(queues);
    this.capacity = capacity;
    this.passengers = new Queue<number>();
    this.maxFloor = queues.length - 1;
    this.currentFloor = -1;
    this.floorHistory = [];
    this.goUp = true;
    this.deliveredPassengers = this.createDeliveredPassengersQueues(queues);
    this.onChange = onChange;
  }

  public run(): Lift {
    this.updateCurrentFloor(0);
    while (!this.canStop()) {
      this.move();
    }
    return this;
  }

  private createWaitingPassengersQueues(queues: number[][]): Queues {
    return queues.reduce((acc, list, index) => {
      acc.set(index, new Queue<number>(list));
      return acc;
    }, new Map());
  }

  private createDeliveredPassengersQueues(queues: number[][]): Queues {
    return queues.reduce((acc, _, index) => {
      acc.set(index, new Queue<number>());
      return acc;
    }, new Map());
  }

  private isWaitingPassengers(): boolean {
    return [...this.waitingPassengers].some(([_, queue]) => queue.size);
  }

  private canStop(): boolean {
    return !this.isWaitingPassengers() && this.currentFloor === 0;
  }

  private runOnChange(): void {
    this.onChange(structuredClone({
      currentFloor: this.currentFloor,
      maxFloor: this.maxFloor, 
      floorHistory: this.floorHistory,
      activePassengers: this.passengers.list,
      deliveredPassengers: [...this.deliveredPassengers.entries()].map(([index, queue]) => queue.list),
      waitingPassengers: [...this.waitingPassengers.entries()].map(([index, queue]) => queue.list),
    }));
  }

  private move(): void {
    this.putDownPassengers();
    this.pickUpPassengers();
    this.goNextFloor();
  }

  private putDownPassengers(): void {
    const removed = this.passengers.remove(this.currentFloor);
    this.deliveredPassengers.set(this.currentFloor, (this.deliveredPassengers.get(this.currentFloor) || new Queue()).enqueue(removed));
  }

  private pickUpPassengers(): void {
    const passengersByCurrentFloor = this.waitingPassengers.get(this.currentFloor);
    if (passengersByCurrentFloor?.size && this.currentFloor === 0 && passengersByCurrentFloor.has(0)) {
      passengersByCurrentFloor.remove(0);
    }
    while (this.passengers.size < this.capacity && passengersByCurrentFloor?.size && this.isGoBySomeWay(this.currentFloor)) {
      const newPassanger = passengersByCurrentFloor.dequeue((value) => this.goUp ? value >= this.currentFloor : value <= this.currentFloor);
      if (newPassanger === undefined) {
        return;
      }
      this.passengers.enqueue(newPassanger);
    }
  }

  private goNextFloorIfHasPassengersForThisDestination(floor: number): boolean {
    if (this.passengers.has(floor)) {
      this.updateCurrentFloor(floor);
      return true;
    }
    return false;
  }

  private isPassangerGoBySomeWay(destination: number, current: number): boolean {
    if (this.goUp) {
      return destination > current;
    }
    return destination < current;
  }

  private isGoBySomeWay(floor: number): boolean {
    const passengersOnFloor = this.waitingPassengers.get(floor);
    if (!passengersOnFloor?.size) return false;
    return passengersOnFloor.has((value: number) => this.isPassangerGoBySomeWay(value, floor));
  }

  private goNextFloorIfHasPassengersByWay(floor: number): boolean {
    const isGo = this.isGoBySomeWay(floor);
    if (isGo) {
      this.updateCurrentFloor(floor);
    }
    return isGo;
  }

  private goUpIfCan(): boolean {
    for (let i = this.currentFloor + 1; i <= this.maxFloor; i++) {
      if (this.goNextFloorIfHasPassengersForThisDestination(i)) {
        return true;
      }
      if (this.goNextFloorIfHasPassengersByWay(i)) {
        return true;
      }
    }
    return false;
  }

  private goDownIfCan(): boolean {
    for (let i = this.currentFloor - 1; i >= 0; i--) {
      if (this.goNextFloorIfHasPassengersForThisDestination(i)) {
        return true;
      }
      if (this.goNextFloorIfHasPassengersByWay(i)) {
        return true;
      }
    }
    return false;
  }

  private goNextFloorIfDifferentWay(floor: number): boolean {
    const passengersOnFloor = this.waitingPassengers.get(floor);
    if (!passengersOnFloor?.size) return false;
    if (passengersOnFloor.has((passenger) => !this.isPassangerGoBySomeWay(passenger, floor) && floor !== passenger)) {
        this.updateCurrentFloor(floor);
        this.goUp = !this.goUp;
        return true;
    }
    return false;
  }

  private goUpSmart(): boolean {
    for (let i = this.maxFloor; i >= this.currentFloor; i--) {
      if (this.goNextFloorIfDifferentWay(i)) {
        return true;
      }
    }
    return false;
  }

  private goDownSmart(): boolean {
    for (let i = 0; i <= this.currentFloor; i++) {
      if (this.goNextFloorIfDifferentWay(i)) {
        return true;
      }
    }
    return false;
  }

  private goNextFloor(): void {
    if (this.goUp) {
      if (this.goUpIfCan()) {
        return;
      }
      if (!this.passengers.size) {
        if (this.goUpSmart()) {
          return;
        }
        this.goUp = false;
        if (this.goDownIfCan()) {
          return;
        }
        if (this.goDownSmart()) {
          return;
        }
      }
    } else {
      if (this.goDownIfCan()) {
        return;
      }
      if (!this.passengers.size) {
        if (this.goDownSmart()) {
          return;
        }
        this.goUp = true;
        if (this.goUpIfCan()) {
          return;
        }
        if (this.goUpSmart()) {
          return;
        }
      }
    }
    this.updateCurrentFloor(0);
  }

  private updateCurrentFloor(floor: number): void {
    if (this.currentFloor === floor) {
      return;
    }
    if (this.goUp && floor < this.currentFloor) {
      this.goUp = false;
    } else if (!this.goUp && floor > this.currentFloor) {
      this.goUp = true;
    }
    this.currentFloor = floor;
    this.floorHistory.push(this.currentFloor);
    this.runOnChange();
  }
}

export const theLift = (queues: number[][], capacity: number, onChange: OnChange): number[] => {
  const { floorHistory } = new Lift(queues, capacity, onChange).run();
  return floorHistory;
};