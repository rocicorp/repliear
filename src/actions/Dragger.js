const Dragger = ({object, startPoint, mouse}) => {
  return {
    ...object,
    x: mouse.x - (startPoint.clientX - startPoint.objectX),
    y: mouse.y - (startPoint.clientY - startPoint.objectY)
  };
};
export default Dragger;