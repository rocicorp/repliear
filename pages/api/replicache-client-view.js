import faunadb from 'faunadb';

const q = faunadb.query;

export default async (req, res) => {
  // TODO: Um, keep this secret with Next environment variables. Yolo.
  const client = new faunadb.Client({secret: 'fnAEB0r_VeACDfFpFovYautQ-N_AvbOM1sLm3Fb3'});
  const result = await client.query(q.Map(q.Paginate(
    q.Documents(q.Collection('objects')), {size: 100000}),
    q.Lambda('r', q.Get(q.Var('r')))));
  const {data} = result;

  const response = {
    lastMutationID: 0,
    clientView: Object.fromEntries(
      data.map(entry => [`/object/${entry.ref.id}`, entry.data]))
  };
  console.debug({response});
  res.status(200).json(response);
};
