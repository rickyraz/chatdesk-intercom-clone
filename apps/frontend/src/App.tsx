import { createEffect, createSignal, Show } from 'solid-js'
import solidLogo from './assets/solid.svg'
import viteLogo from '/vite.svg'
import './App.css'
// import WebSocketClient from './components/WebSocketClient'
import WebSocketComparison from './components/WebSocketComparison'
import WebsocketSubsSimple from './components/WebsocketSubsSimple'

function App() {
  const [count, setCount] = createSignal(0)
  // const [showComparison, setShowComparison] = createSignal(false)
  // const [showComparison, setShowComparison] = createSignal<boolean>(
  //   localStorage.getItem('showComparison') === 'true'
  // );

  // createEffect(() => {
  //   localStorage.setItem('showComparison', showComparison().toString());
  // });

  const initialValue = localStorage.getItem('showComparison') === 'true'
  const [showComparison, setShowComparison] = createSignal<boolean>(initialValue);

  createEffect(() => {
    localStorage.setItem('showComparison', showComparison().toString());
  });


  return (
    <>
      <div class='flex justify-between'>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} class="logo" alt="Vite logo" />
        </a>
        <a href="https://solidjs.com" target="_blank">
          <img src={solidLogo} class="logo solid" alt="Solid logo" />
        </a>
      </div>
      <h1>Vite + Solid</h1>
      <div class="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count()}
        </button>
        <button
          onClick={() => setShowComparison(!showComparison())}
          style={{
            'margin-left': '10px',
            'background-color': showComparison() ? '#dc2626' : '#16a34a'
          }}
        >
          {showComparison() ? 'Hide' : 'Show'} WebSocket Comparison
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p class="read-the-docs">
        Click on the Vite and Solid logos to learn more
      </p>

      <Show when={showComparison()}>
        <WebSocketComparison />
      </Show>

      <WebsocketSubsSimple />
    </>
  )
}

export default App
