// Shows the owner's plain text from Settings as tidy paragraphs.
// Supports "## Heading" lines and "- " bullet lists. Everything is shown as
// plain text, so nothing typed in Settings can inject code into the page.

export default function RichText({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  let para: string[] = [];

  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={blocks.length}>
          {list.map((li, i) => (
            <li key={i}>{li}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  const flushPara = () => {
    if (para.length) {
      blocks.push(<p key={blocks.length}>{para.join(' ')}</p>);
      para = [];
    }
  };

  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) {
      flushList();
      flushPara();
    } else if (line.startsWith('## ')) {
      flushList();
      flushPara();
      blocks.push(<h2 key={blocks.length}>{line.slice(3)}</h2>);
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      flushPara();
      list.push(line.slice(2));
    } else {
      flushList();
      para.push(line);
    }
  }
  flushList();
  flushPara();
  return <div className="prose">{blocks}</div>;
}
