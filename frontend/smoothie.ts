import hermite from "cubic-hermite";
import { useEffect, useState } from "react";
import { Replicache, ReadTransaction } from "replicache";
import { getClientState } from "../frontend/client-state";
import { getShape } from "../frontend/shape";

/**
 * Gets the current position of the cursor for `clientID`, but smoothing out
 * the motion by interpolating extra frames.
 */
export function useCursor(
  rep: Replicache,
  clientID: string
): { x: number; y: number } | null {
  const [values, setValues] = useState<Array<number> | null>(null);
  const smoothie = Smoothie.get(
    rep,
    `cursor/${clientID}`,
    async (tx: ReadTransaction) => {
      const clientState = await getClientState(tx, clientID);
      return [clientState.cursor.x, clientState.cursor.y];
    }
  );
  useListener(smoothie, setValues, clientID);
  if (!values) {
    return null;
  }
  const [x, y] = values;
  return { x, y };
}

/**
 * Gets the current position of the shape for `shapeID`, but smoothing out
 * the motion by interpolating extra frames.
 */
export function useShape(rep: Replicache, shapeID: string) {
  const [values, setValues] = useState<Array<number> | null>(null);
  const smoother = Smoothie.get(
    rep,
    `shape/${shapeID}`,
    async (tx: ReadTransaction) => {
      const shape = await getShape(tx, shapeID);
      return (
        shape && [shape.x, shape.y, shape.width, shape.height, shape.rotate]
      );
    }
  );
  useListener(smoother, setValues, shapeID);
  if (!values) {
    return null;
  }
  const [x, y, w, h, r] = values;
  return { x, y, w, h, r };
}

/**
 * Tracks progress of an animation smoothing jumps between one or more
 * numeric properties.
 */
type Animation = {
  startValues: Array<number>;
  targetValues: Array<number>;
  startVelocities: Array<number>;
  targetVelocities: Array<number>;
  startTime: number;
  duration: number;
  currentValues: Array<number>;
  timerID: number;
};

type Listener = (current: Array<number> | null) => void;
type SubscriptionFunction = (
  tx: ReadTransaction
) => Promise<Array<number> | null>;

const minAnimationDuration = 50;
const maxAnimationDuration = 5000;

/**
 * Smoothie interpolates frames between Repicache subscription notifications.
 *
 * We cannot simply animate at the UI layer, because we need multiple UI
 * elements that appear to be together (e.g., the selection highlight for
 * a shape and the shape itself) to animate in lockstep. The UI lacks
 * sufficient information to synchronize this way.
 *
 * We use hermite splines to smooth out the frames that we get because they
 * are easy to use and create a more appealing curve than simply chaining
 * tweens between frames.
 */
class Smoothie {
  private static instances = new Map<string, Smoothie>();

  /**
   * Gets the specified named instance
   * @param rep Replicache instance to query
   * @param key Unique name for the data to extract / smooth
   * @param sub A subscription function, of the type that would be passed to
   * Replicache.subscribe(). The return value must be an Array of numbers.
   * These are the values we will smooth over time.
   * @returns
   */
  static get(
    rep: Replicache,
    key: string,
    sub: SubscriptionFunction
  ): Smoothie {
    let s = this.instances.get(key);
    if (!s) {
      s = new Smoothie(rep, sub);
      this.instances.set(key, s);
    }
    return s;
  }

  private rep: Replicache;

  // The target values we're currently animating to.
  private latestTargets: Array<number> | null = null;

  // The latest time the latestTargets changed.
  private latestTimestamp = 0;

  // The current animation we're running. Only non-null when one is
  // actually running.
  private currentAnimation: Animation | null = null;

  // Current listeners.
  private listeners = new Set<Listener>();

  private constructor(rep: Replicache, sub: SubscriptionFunction) {
    this.rep = rep;
    this.rep.subscribe(sub, {
      onData: (targets) => {
        const now = performance.now();

        // We can flip back to null, for example if the object we are watching
        // gets deleted. So we must handle that and count it as achange.
        if (targets == null) {
          this.jumpTo(null, now);
          return;
        }

        if (this.latestTargets == null) {
          this.jumpTo(targets, now);
          return;
        }

        if (!shallowEqual(targets, this.latestTargets)) {
          if (targets.length != this.latestTargets.length) {
            console.info("Number of targets changed - ignoring");
            return;
          }

          let duration = now - this.latestTimestamp;
          if (duration < minAnimationDuration) {
            // If the time since last frame is very short, it looks better to
            // skip the animation. This mainly happens with frames generated
            // locally.
            this.jumpTo(targets, now);
          } else if (!this.currentAnimation) {
            // Otherwise if there's no current animation running, start one.
            this.currentAnimation = {
              startValues: this.latestTargets,
              targetValues: targets,
              startVelocities: targets.map((_) => 0),
              targetVelocities: targets.map((_) => 0),
              startTime: now,
              duration: this.frameDuration(now),
              currentValues: this.latestTargets,
              timerID: this.scheduleAnimate(),
            };
          } else {
            // Otherwise, cancel the existing animation and start a new one.
            cancelAnimationFrame(this.currentAnimation.timerID);

            const t =
              (now - this.currentAnimation.startTime) /
              this.currentAnimation.duration;

            // Get the current velocities. These will be the initial
            // velocities for the new animation.
            const startVelocities = hermite.derivative(
              this.currentAnimation.startValues,
              this.currentAnimation.startVelocities,
              this.currentAnimation.targetValues,
              this.currentAnimation.targetVelocities,
              Math.max(0, Math.min(t, 1))
            );
            this.currentAnimation = {
              startValues: this.currentAnimation.currentValues,
              targetValues: targets,
              startVelocities,
              targetVelocities: targets.map((_) => 0),
              startTime: now,
              duration: this.frameDuration(now),
              currentValues: this.currentAnimation.currentValues,
              timerID: this.scheduleAnimate(),
            };
          }
          this.latestTargets = targets;
          this.latestTimestamp = now;
        }
      },
    });
  }

  jumpTo(targets: Array<number> | null, now: number) {
    this.currentAnimation &&
      cancelAnimationFrame(this.currentAnimation.timerID);
    this.currentAnimation = null;
    this.latestTargets = targets;
    this.latestTimestamp = now;
    this.fire();
  }

  scheduleAnimate() {
    return requestAnimationFrame((time) => {
      if (!this.currentAnimation) {
        return;
      }

      // Update the current animated values.
      const t =
        (performance.now() - this.currentAnimation.startTime) /
        this.currentAnimation.duration;
      this.currentAnimation = {
        ...this.currentAnimation,
        currentValues: hermite(
          this.currentAnimation.startValues,
          this.currentAnimation.startVelocities,
          this.currentAnimation.targetValues,
          this.currentAnimation.targetVelocities,
          Math.min(1, Math.max(0, t))
        ),
      };
      this.fire();
      if (t >= 1) {
        // If we're done, clear the animation.
        this.currentAnimation = null;
        return;
      }
      // Otherwise, schedule the next frame.
      this.currentAnimation.timerID == this.scheduleAnimate();
    });
  }

  private getCurrentValues(): Array<number> | null {
    if (this.currentAnimation) {
      return this.currentAnimation.currentValues;
    } else if (this.latestTargets) {
      return this.latestTargets;
    } else {
      return null;
    }
  }

  addListener(l: Listener) {
    this.listeners.add(l);
    const c = this.getCurrentValues();
    if (c) {
      l(c);
    }
  }

  removeListener(l: Listener) {
    this.listeners.delete(l);
  }

  fire() {
    const c = this.getCurrentValues();
    this.listeners.forEach((l) => {
      try {
        l(c);
      } catch (e) {
        console.error(e);
      }
    });
  }

  frameDuration(now: number) {
    return Math.min(
      maxAnimationDuration,
      // We can't simply use the delay since the last frame as the
      // duration for the animation because we want the animation to smoothly
      // slow down and stop once we stop receving events. But if we're receiving
      // frames approximately every Fms, and we set the duration of each frame's
      // animation to be Fms, then we will see a choppy movement when these
      // animations are connected one to the next.
      //
      // Also we sometimes get frames in which no movement occurs.
      // This is because push can take longer than pull, so we
      // might have pushes happening at a rate of 150ms/frame, and pulls
      // happening at a rate of 100ms/frame. So every third frame or so
      // we'd get no new position information. In that case, if the frame duration
      // is close to the rate pulls are happening, we'll see the
      // animation slow down then speed up again.
      //
      // Instead, we arbitrarily assume that there are n additional frames
      // coming after this one. This has the effect of smoothing out the
      // animation at the cost of extending the animation n frames longer than it
      // actually took on the source machine.
      (now - this.latestTimestamp) * 3
    );
  }
}

function useListener(
  smoother: Smoothie,
  listener: (values: Array<number> | null) => void,
  dep: string
) {
  useEffect(() => {
    smoother.addListener(listener);
    return () => smoother.removeListener(listener);
  }, [dep]);
}

function shallowEqual(a1: any[], a2: any[]) {
  if (a1.length != a2.length) {
    return false;
  }
  if (a1.some((v1, idx) => v1 != a2[idx])) {
    return false;
  }
  return true;
}
