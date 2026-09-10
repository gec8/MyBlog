export default function Loading() {
  return <main className="page-loading" aria-busy="true" aria-label="页面正在加载">
    <header aria-hidden="true"><i /><span /></header>
    <section aria-hidden="true"><p /><h1><span className="sr-only">正在加载页面</span></h1><h1><span className="sr-only">请稍候</span></h1><small /><button aria-label="内容加载中" /></section>
    <div aria-hidden="true"><p /><h2><span className="sr-only">文章加载中</span></h2><article /><article /></div>
  </main>;
}
