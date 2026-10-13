import RichText from './RichText';

export default function InfoPage({ title, text }: { title: string; text: string }) {
  return (
    <div className="container">
      <div className="page-head">
        <h1>{title}</h1>
        <hr className="divider" />
      </div>
      <RichText text={text} />
    </div>
  );
}
