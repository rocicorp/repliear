import dynamic from 'next/dynamic'
import Head from 'next/head'
import styles from '../styles/Home.module.css'

const Mondrian = dynamic(
  () => import('../examples/components/Mondrian'),
  { ssr: false }
);

export default function Home() {
  return <Mondrian/>;
}
