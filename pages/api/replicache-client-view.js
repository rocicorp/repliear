export default (req, res) => {
  res.status(200).json({
    // We'll come back to this when we implement mutations
    "lastMutationID": 0,
    "clientView": {
      // o1 is the unique ID
      "/object/1": {
        "width": 163,
        "height": 84,
        "rotate": 0,
        "strokeWidth": 0,
        "fill": "rgba(0, 123, 255, 1)",
        "radius": "0",
        "blendMode": "normal",
        "type": "rectangle",
        "x": 17,
        "y": 15
      },
      "/object/2": {
        "width": 70,
        "height": 146,
        "rotate": 0,
        "strokeWidth": 0,
        "fill": "rgba(255, 255, 255, 1)",
        "radius": "0",
        "blendMode": "normal",
        "type": "rectangle",
        "x": 19,
        "y": 109
      },
      "/object/3": {
        "width": 81,
        "height": 69,
        "rotate": 0,
        "strokeWidth": 0,
        "fill": "rgba(241, 97, 99, 1)",
        "radius": "0",
        "blendMode": "normal",
        "type": "rectangle",
        "x": 100,
        "y": 110
      },
      "/object/4": {
        "width": 231,
        "height": 70,
        "rotate": 0,
        "strokeWidth": 0,
        "fill": "rgba(0, 123, 255, 1)",
        "radius": "0",
        "blendMode": "normal",
        "type": "rectangle",
        "x": 100,
        "y": 187
      },
      "/object/5": {
        "width": 183,
        "height": 60,
        "rotate": 0,
        "strokeWidth": 0,
        "fill": "rgba(255, 241, 0, 1)",
        "radius": "0",
        "blendMode": "normal",
        "type": "rectangle",
        "x": 19,
        "y": 265
      },
      "/object/6": {
        "width": 118,
        "height": 119,
        "rotate": 0,
        "strokeWidth": 0,
        "fill": "rgba(241, 97, 99, 1)",
        "radius": "0",
        "blendMode": "normal",
        "type": "rectangle",
        "x": 211,
        "y": 266
      },
      "/object/7": {
        "width": 82,
        "height": 51,
        "rotate": 0,
        "strokeWidth": 0,
        "fill": "rgba(255, 255, 255, 1)",
        "radius": "0",
        "blendMode": "normal",
        "type": "rectangle",
        "x": 120,
        "y": 333
      },
      "/object/8": {
        "width": 89,
        "height": 50,
        "rotate": 0,
        "strokeWidth": 0,
        "fill": "rgba(241, 97, 99, 1)",
        "radius": "0",
        "blendMode": "normal",
        "type": "rectangle",
        "x": 21,
        "y": 334
      },
      "/object/9": {
        "width": 143,
        "height": 160,
        "rotate": 0,
        "strokeWidth": 0,
        "fill": "rgba(255, 241, 0, 1)",
        "radius": "0",
        "blendMode": "normal",
        "type": "rectangle",
        "x": 190,
        "y": 16
      }
    }
  });
};
