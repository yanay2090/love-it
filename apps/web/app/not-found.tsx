export default function NotFound() {
  return (
    <main className="page home">
      <a className="wordmark" href="/">
        Love it <i>♥</i>
      </a>
      <h1>That page isn’t on the map.</h1>
      <p className="lede">Try a demo profile while the city is still just Tel Aviv.</p>
      <div className="home-links">
        <a className="person-link" href="/yael.loves">
          <span style={{ background: '#F08A3A' }}>YD</span>
          <b>@yael.loves</b>
        </a>
        <a className="person-link" href="/tom.sips">
          <span style={{ background: '#3D8BFF' }}>TS</span>
          <b>@tom.sips</b>
        </a>
      </div>
    </main>
  );
}
