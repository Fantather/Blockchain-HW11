import { useCallback, useEffect, useRef, useState } from "react";
import { CHAIN_ID, Media, addMedia, deleteMedia, fetchMedia, subscribeToChanges } from "./contract";
import { HAS_API_KEY, NO_API_KEY, imageUrl, uploadToIpfs } from "./storage";
import { errorMessage, getAccounts, getChainId, requestAccounts, switchToLocalNetwork } from "./wallet";

type Stage = "idle" | "uploading" | "confirming";

function formatDate(seconds: bigint): string {
  return new Date(Number(seconds) * 1000).toLocaleString("ru-RU");
}

function sameAddress(a: string | null, b: string | null): boolean {
  return a !== null && b !== null && a.toLowerCase() === b.toLowerCase();
}

interface MediaCardProps {
  item: Media;
  own: boolean;
  disabled: boolean;
  onDelete: (item: Media) => void;
}

function MediaCard({ item, own, disabled, onDelete }: MediaCardProps) {
  const [broken, setBroken] = useState(false);

  return (
    <article className="card">
      {broken ? (
        <div className="card-image card-image-empty">Не удалось загрузить изображение</div>
      ) : (
        <img className="card-image" src={imageUrl(item.cid)} alt={item.name} onError={() => setBroken(true)} />
      )}
      <p className="card-name">{item.name}</p>
      <div className="card-meta">
        <span className="address">{item.owner}</span>
        <span>{formatDate(item.createdAt)}</span>
      </div>
      {own && (
        <div className="card-actions">
          <button className="danger" onClick={() => onDelete(item)} disabled={disabled}>Удалить</button>
        </div>
      )}
    </article>
  );
}

export default function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const uploaded = useRef<{ file: File; cid: string } | null>(null);

  const hasWallet = window.ethereum !== undefined;
  const wrongNetwork = account !== null && chainId !== CHAIN_ID;
  const canWrite = account !== null && !wrongNetwork && !busy;

  const loadMedia = useCallback(async () => {
    try {
      setMedia(await fetchMedia());
      setError("");
    } catch {
      setError("Не удалось прочитать картинки. Проверьте, запущена ли нода и выполнен ли деплой");
    }
  }, []);

  useEffect(() => {
    loadMedia();
    return subscribeToChanges(loadMedia);
  }, [loadMedia]);

  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) {
      return;
    }
    getAccounts().then((accounts) => setAccount(accounts[0] ?? null));
    getChainId().then(setChainId);

    const onAccounts = (accounts: unknown) => setAccount((accounts as string[])[0] ?? null);
    const onChain = (id: unknown) => setChainId(parseInt(id as string, 16));
    ethereum.on("accountsChanged", onAccounts);
    ethereum.on("chainChanged", onChain);
    return () => {
      ethereum.removeListener("accountsChanged", onAccounts);
      ethereum.removeListener("chainChanged", onChain);
    };
  }, []);

  async function connect() {
    setError("");
    try {
      const accounts = await requestAccounts();
      setAccount(accounts[0] ?? null);
      setChainId(await getChainId());
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function switchNetwork() {
    setError("");
    try {
      await switchToLocalNetwork();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim() === "") {
      setError("Введите имя картинки");
      return;
    }
    if (!file) {
      setError("Выберите файл");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Можно загружать только изображения");
      return;
    }

    setBusy(true);
    try {
      let cid: string;
      if (uploaded.current && uploaded.current.file === file) {
        cid = uploaded.current.cid;
      } else {
        setStage("uploading");
        try {
          cid = await uploadToIpfs(file);
        } catch (err) {
          setError("Ошибка загрузки в IPFS: " + errorMessage(err));
          return;
        }
        uploaded.current = { file, cid };
      }

      setStage("confirming");
      try {
        await addMedia(cid, name.trim());
      } catch (err) {
        setError("Ошибка транзакции: " + errorMessage(err));
        return;
      }

      uploaded.current = null;
      setName("");
      setFile(null);
      setFileKey((k) => k + 1);
      await loadMedia();
    } finally {
      setStage("idle");
      setBusy(false);
    }
  }

  async function removeMedia(item: Media) {
    setError("");
    setBusy(true);
    try {
      await deleteMedia(item.id);
      await loadMedia();
    } catch (err) {
      setError("Ошибка транзакции: " + errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const status =
    stage === "uploading" ? "Загрузка в IPFS..." : stage === "confirming" ? "Подтвердите транзакцию..." : "";

  return (
    <div className="page">
      <h1>Картинки</h1>

      <div className="wallet">
        {!hasWallet && <p className="error">MetaMask не найден. Установите расширение MetaMask и обновите страницу</p>}
        {hasWallet && !account && <button onClick={connect}>Подключить кошелёк</button>}
        {account && <p>Подключено: <strong>{account}</strong></p>}
        {wrongNetwork && (
          <p className="error">
            Неверная сеть (chainId {chainId}). <button onClick={switchNetwork}>Переключить на {CHAIN_ID}</button>
          </p>
        )}
      </div>

      <section className="panel">
        <h2>Новая картинка</h2>
        {!HAS_API_KEY && <p className="error">{NO_API_KEY}</p>}
        <form onSubmit={submit}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Имя картинки"
            disabled={busy}
          />
          <input
            key={fileKey}
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={busy}
          />
          <button type="submit" disabled={!canWrite || !HAS_API_KEY}>
            {busy ? "Ожидание..." : "Загрузить"}
          </button>
        </form>
        {status && <p className="status">{status}</p>}
      </section>

      {error && <p className="error">{error}</p>}

      <h2>Все картинки</h2>

      <div className="feed">
        {media.map((m) => (
          <MediaCard
            key={m.id.toString()}
            item={m}
            own={sameAddress(account, m.owner)}
            disabled={!canWrite}
            onDelete={removeMedia}
          />
        ))}
      </div>
      {media.length === 0 && <p>Картинок пока нет</p>}
    </div>
  );
}
