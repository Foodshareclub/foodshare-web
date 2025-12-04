/**
 * Distance Calculation Property Tests
 * Property-based tests for geographic distance calculations
 * 
 * **Feature: codebase-improvement, Property 1: Distance Calculation Symmetry**
 * **Feature: codebase-improvement, Property 2: Distance Non-Negativity**
 * **Validates: Requirements 2.4**
 */

import * as fc from 'fast-check';
import { getDistanceFromLatLonInKm } from '../getDistanceFromLatLonInKm';

// Arbitrary for valid latitude (-90 to 90)
const latitudeArbitrary = fc.double({ min: -90, max: 90, noNaN: true });

// Arbitrary for valid longitude (-180 to 180)
const longitudeArbitrary = fc.double({ min: -180, max: 180, noNaN: true });

// Arbitrary for a coordinate pair
const coordinateArbitrary = fc.record({
  lat: latitudeArbitrary,
  lng: longitudeArbitrary,
});

describe('Distance Calculation Properties', () => {
  /**
   * Property 1: Distance Calculation Symmetry
   * **Feature: codebase-improvement, Property 1: Distance Calculation Symmetry**
   * **Validates: Requirements 2.4**
   */
  it('Property 1: distance(A, B) === distance(B, A) (symmetry)', () => {
    fc.assert(
      fc.property(
        coordinateArbitrary,
        coordinateArbitrary,
        (coordA, coordB) => {
          const distanceAB = getDistanceFromLatLonInKm(coordA.lat, coordA.lng, coordB.lat, coordB.lng);
          const distanceBA = getDistanceFromLatLonInKm(coordB.lat, coordB.lng, coordA.lat, coordA.lng);
          const tolerance = 0.001;
          return Math.abs(distanceAB - distanceBA) < tolerance;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: Distance Non-Negativity
   * **Feature: codebase-improvement, Property 2: Distance Non-Negativity**
   * **Validates: Requirements 2.4**
   */
  it('Property 2: distance >= 0 (non-negativity)', () => {
    fc.assert(
      fc.property(
        coordinateArbitrary,
        coordinateArbitrary,
        (coordA, coordB) => {
          const distance = getDistanceFromLatLonInKm(coordA.lat, coordA.lng, coordB.lat, coordB.lng);
          return distance >= 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 3: distance(A, A) === 0 (identity)', () => {
    fc.assert(
      fc.property(
        coordinateArbitrary,
        (coord) => {
          const distance = getDistanceFromLatLonInKm(coord.lat, coord.lng, coord.lat, coord.lng);
          return distance === 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});

export { coordinateArbitrary, latitudeArbitrary, longitudeArbitrary };
