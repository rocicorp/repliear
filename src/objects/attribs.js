export function getObjectAttributes(state) {
  const style = getStyle(state);
  const transform = getTransformMatrix(state);
  delete state.blendMode;
  return {
    style,
    transform,
    ...state,
  };
}

function getStyle(data) {
  return {
    mixBlendMode: data.blendMode
  }
}

function getTransformMatrix({rotate, x, y, width, height}) {
  if (!rotate) {
    return null;
  }
  let centerX = width / 2 + x;
  let centerY = height / 2 + y;
  return `rotate(${rotate} ${centerX} ${centerY})`;
}
