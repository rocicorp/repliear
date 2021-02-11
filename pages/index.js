import dynamic from 'next/dynamic'

const Mondrian = dynamic(
  () => import('../examples/components/Mondrian'),
  { ssr: false }
);

export default function Home() {
  return <Mondrian/>;
}
