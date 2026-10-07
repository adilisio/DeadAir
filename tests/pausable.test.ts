import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PauseClock } from '../src/sim/pausable';

describe('PauseClock', () => {
  let t = 0;
  const clock = () => new PauseClock(() => t);
  const advance = (ms: number) => {
    t += ms;
    vi.advanceTimersByTime(ms);
  };
  beforeEach(() => {
    t = 0;
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('runs a timeout as setTimeout does when not paused', () => {
    const c = clock();
    const fn = vi.fn();
    c.timeout(fn, 1000);
    advance(999);
    expect(fn).not.toHaveBeenCalled();
    advance(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('holds a timeout while paused and finishes the time that was left', () => {
    const c = clock();
    const fn = vi.fn();
    c.timeout(fn, 1000);
    advance(400);
    c.setPaused(true);
    advance(5000);
    expect(fn).not.toHaveBeenCalled();
    c.setPaused(false);
    advance(599);
    expect(fn).not.toHaveBeenCalled();
    advance(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('survives several pauses and a timeout made while paused', () => {
    const c = clock();
    const a = vi.fn();
    const b = vi.fn();
    c.timeout(a, 300);
    advance(100);
    c.setPaused(true);
    c.timeout(b, 100);
    advance(1000);
    c.setPaused(false);
    advance(50);
    c.setPaused(true);
    advance(1000);
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
    c.setPaused(false);
    advance(50);
    expect(b).toHaveBeenCalledTimes(1);
    expect(a).not.toHaveBeenCalled();
    advance(100);
    expect(a).toHaveBeenCalledTimes(1);
  });

  it('clear cancels, paused or not', () => {
    const c = clock();
    const fn = vi.fn();
    const h = c.timeout(fn, 100);
    c.setPaused(true);
    h.clear();
    c.setPaused(false);
    advance(1000);
    expect(fn).not.toHaveBeenCalled();
  });

  it('now() stands still while paused and skips the pause after', () => {
    const c = clock();
    advance(100);
    expect(c.now()).toBe(100);
    c.setPaused(true);
    advance(500);
    expect(c.now()).toBe(100);
    c.setPaused(false);
    expect(c.now()).toBe(100);
    advance(50);
    expect(c.now()).toBe(150);
  });
});
