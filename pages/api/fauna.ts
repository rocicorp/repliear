import faunadb from 'faunadb';

export function faunaClient(): faunadb.Client {
  // TODO: Um, keep this secret with Next environment variables. Yolo.
  return new faunadb.Client({secret: 'fnAEB0r_VeACDfFpFovYautQ-N_AvbOM1sLm3Fb3'});
}
