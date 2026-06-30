import { protocolVersion } from "@noesis/shared";

const panels = ["Gateway", "Machines", "Tasks"] as const;

export function App() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Noesis 灵识</p>
        <h1>人机共生工作台初始化壳</h1>
        <p>当前只展示 P0 控制闭环占位：Gateway、Machines、Tasks。</p>
        <p className="protocol">Protocol {protocolVersion}</p>
      </section>

      <section className="panelGrid" aria-label="P0 控制闭环占位">
        {panels.map((panel) => (
          <article className="panel" key={panel}>
            <h2>{panel}</h2>
            <p>等待对应 vertical slice 接入真实数据。</p>
          </article>
        ))}
      </section>
    </main>
  );
}
