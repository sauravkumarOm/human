/**
 * Module that interpolates results for smoother animations
 */

import type { Result, Face, Body, Hand, Item, Gesture, Person } from './result';

const bufferedResult: Result = { face: [], body: [], hand: [], gesture: [], object: [], persons: [], performance: {}, timestamp: 0 };

export function calc(newResult: Result): Result {
  // each record is only updated using deep clone when number of detected record changes, otherwise it will converge by itself
  // otherwise bufferedResult is a shallow clone of result plus updated local calculated values
  // thus mixing by-reference and by-value assignments to minimize memory operations

  const bufferedFactor = 1000 / (Date.now() - newResult.timestamp) / 4;

  // interpolate body results
  if (!bufferedResult.body || (newResult.body.length !== bufferedResult.body.length)) {
    bufferedResult.body = JSON.parse(JSON.stringify(newResult.body as Body[])); // deep clone once
  } else {
    for (let i = 0; i < newResult.body.length; i++) {
      const box = newResult.body[i].box // update box
        .map((b, j) => ((bufferedFactor - 1) * bufferedResult.body[i].box[j] + b) / bufferedFactor) as [number, number, number, number];
      const boxRaw = newResult.body[i].boxRaw // update boxRaw
        .map((b, j) => ((bufferedFactor - 1) * bufferedResult.body[i].boxRaw[j] + b) / bufferedFactor) as [number, number, number, number];
      const keypoints = (newResult.body[i].keypoints // update keypoints
        .map((keypoint, j) => ({
          score: keypoint.score,
          part: keypoint.part,
          position: [
            bufferedResult.body[i].keypoints[j] ? ((bufferedFactor - 1) * bufferedResult.body[i].keypoints[j].position[0] + keypoint.position[0]) / bufferedFactor : keypoint.position[0],
            bufferedResult.body[i].keypoints[j] ? ((bufferedFactor - 1) * bufferedResult.body[i].keypoints[j].position[1] + keypoint.position[1]) / bufferedFactor : keypoint.position[1],
          ],
          positionRaw: [
            bufferedResult.body[i].keypoints[j] ? ((bufferedFactor - 1) * bufferedResult.body[i].keypoints[j].positionRaw[0] + keypoint.positionRaw[0]) / bufferedFactor : keypoint.position[0],
            bufferedResult.body[i].keypoints[j] ? ((bufferedFactor - 1) * bufferedResult.body[i].keypoints[j].positionRaw[1] + keypoint.positionRaw[1]) / bufferedFactor : keypoint.position[1],
          ],
        }))) as Array<{ score: number, part: string, position: [number, number, number?], positionRaw: [number, number, number?] }>;
      bufferedResult.body[i] = { ...newResult.body[i], box, boxRaw, keypoints }; // shallow clone plus updated values
    }
  }

  // interpolate hand results
  if (!bufferedResult.hand || (newResult.hand.length !== bufferedResult.hand.length)) {
    bufferedResult.hand = JSON.parse(JSON.stringify(newResult.hand as Hand[])); // deep clone once
  } else {
    for (let i = 0; i < newResult.hand.length; i++) {
      const box = (newResult.hand[i].box// update box
        .map((b, j) => ((bufferedFactor - 1) * bufferedResult.hand[i].box[j] + b) / bufferedFactor)) as [number, number, number, number];
      const boxRaw = (newResult.hand[i].boxRaw // update boxRaw
        .map((b, j) => ((bufferedFactor - 1) * bufferedResult.hand[i].boxRaw[j] + b) / bufferedFactor)) as [number, number, number, number];
      const keypoints = newResult.hand[i].keypoints // update landmarks
        .map((landmark, j) => landmark
          .map((coord, k) => (((bufferedFactor - 1) * bufferedResult.hand[i].keypoints[j][k] + coord) / bufferedFactor)) as [number, number, number]);
      const keys = Object.keys(newResult.hand[i].annotations); // update annotations
      const annotations = {};
      for (const key of keys) {
        annotations[key] = newResult.hand[i].annotations[key]
          .map((val, j) => val.map((coord, k) => ((bufferedFactor - 1) * bufferedResult.hand[i].annotations[key][j][k] + coord) / bufferedFactor));
      }
      bufferedResult.hand[i] = { ...newResult.hand[i], box, boxRaw, keypoints, annotations }; // shallow clone plus updated values
    }
  }

  // interpolate face results
  if (!bufferedResult.face || (newResult.face.length !== bufferedResult.face.length)) {
    bufferedResult.face = JSON.parse(JSON.stringify(newResult.face as Face[])); // deep clone once
  } else {
    for (let i = 0; i < newResult.face.length; i++) {
      const box = (newResult.face[i].box // update box
        .map((b, j) => ((bufferedFactor - 1) * bufferedResult.face[i].box[j] + b) / bufferedFactor)) as [number, number, number, number];
      const boxRaw = (newResult.face[i].boxRaw // update boxRaw
        .map((b, j) => ((bufferedFactor - 1) * bufferedResult.face[i].boxRaw[j] + b) / bufferedFactor)) as [number, number, number, number];
      const matrix = newResult.face[i].rotation.matrix;
      const angle = {
        roll: ((bufferedFactor - 1) * bufferedResult.face[i].rotation.angle.roll + newResult.face[i].rotation.angle.roll) / bufferedFactor,
        yaw: ((bufferedFactor - 1) * bufferedResult.face[i].rotation.angle.yaw + newResult.face[i].rotation.angle.yaw) / bufferedFactor,
        pitch: ((bufferedFactor - 1) * bufferedResult.face[i].rotation.angle.pitch + newResult.face[i].rotation.angle.pitch) / bufferedFactor,
      };
      const gaze = {
        // not fully correct due projection on circle, also causes wrap-around draw on jump from negative to positive
        bearing: ((bufferedFactor - 1) * bufferedResult.face[i].rotation.gaze.bearing + newResult.face[i].rotation.gaze.bearing) / bufferedFactor,
        strength: ((bufferedFactor - 1) * bufferedResult.face[i].rotation.gaze.strength + newResult.face[i].rotation.gaze.strength) / bufferedFactor,
      };
      const rotation = { angle, matrix, gaze };
      bufferedResult.face[i] = { ...newResult.face[i], rotation, box, boxRaw }; // shallow clone plus updated values
    }
  }

  // interpolate object detection results
  if (!bufferedResult.object || (newResult.object.length !== bufferedResult.object.length)) {
    bufferedResult.object = JSON.parse(JSON.stringify(newResult.object as Item[])); // deep clone once
  } else {
    for (let i = 0; i < newResult.object.length; i++) {
      const box = (newResult.object[i].box // update box
        .map((b, j) => ((bufferedFactor - 1) * bufferedResult.object[i].box[j] + b) / bufferedFactor)) as [number, number, number, number];
      const boxRaw = (newResult.object[i].boxRaw // update boxRaw
        .map((b, j) => ((bufferedFactor - 1) * bufferedResult.object[i].boxRaw[j] + b) / bufferedFactor)) as [number, number, number, number];
      bufferedResult.object[i] = { ...newResult.object[i], box, boxRaw }; // shallow clone plus updated values
    }
  }

  // interpolate person results
  const newPersons = newResult.persons; // trigger getter function
  if (!bufferedResult.persons || (newPersons.length !== bufferedResult.persons.length)) {
    bufferedResult.persons = JSON.parse(JSON.stringify(newPersons as Person[]));
  } else {
    for (let i = 0; i < newPersons.length; i++) { // update person box, we don't update the rest as it's updated as reference anyhow
      bufferedResult.persons[i].box = (newPersons[i].box
        .map((box, j) => ((bufferedFactor - 1) * bufferedResult.persons[i].box[j] + box) / bufferedFactor)) as [number, number, number, number];
    }
  }

  // just copy latest gestures without interpolation
  bufferedResult.gesture = newResult.gesture as Gesture[];
  bufferedResult.performance = newResult.performance;

  return bufferedResult;
}
