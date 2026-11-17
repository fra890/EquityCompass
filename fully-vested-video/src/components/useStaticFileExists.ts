import {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';

/**
 * Checks whether a file exists in /public, so optional assets (logo, audio)
 * can be skipped instead of failing the render.
 * Returns null while checking, then true or false.
 */
export const useStaticFileExists = (file: string | null | undefined) => {
  const [exists, setExists] = useState<boolean | null>(file ? null : false);
  const [handle] = useState(() => delayRender(`Checking for public/${file}`));

  useEffect(() => {
    if (!file) {
      setExists(false);
      continueRender(handle);
      return;
    }
    let cancelled = false;
    fetch(staticFile(file), {method: 'HEAD'})
      .then((res) => {
        const type = res.headers.get('content-type') ?? '';
        return res.ok && !type.includes('text/html');
      })
      .catch(() => false)
      .then((ok) => {
        if (!cancelled) setExists(ok);
        continueRender(handle);
      });
    return () => {
      cancelled = true;
    };
  }, [file, handle]);

  return exists;
};
