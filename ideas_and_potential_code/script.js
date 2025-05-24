function createSvgLayer(url) {
  const obj = document.createElement('object');
  obj.type = "image/svg+xml";
  obj.data = url;
  obj.className = "svg-layer";
  return obj;
}

function cycleVariants(aspectBox, urls, cellId, interval = 4000) {
  let current = 0;
  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0
  });
  aspectBox.appendChild(container);

  let currentLayer = createSvgLayer(urls[current]);
  currentLayer.classList.add('visible');
  container.appendChild(currentLayer);

  let paused = false;

  aspectBox.addEventListener('mouseenter', () => paused = true);
  aspectBox.addEventListener('mouseleave', () => paused = false);

  aspectBox.addEventListener('click', () => {
    window.location.href = `details.html?cell=${cellId}&variant=${current}`;
  });

  setInterval(() => {
    if (paused) return;

    const next = (current + 1) % urls.length;
    const nextLayer = createSvgLayer(urls[next]);
    container.appendChild(nextLayer);

    requestAnimationFrame(() => {
      nextLayer.classList.add('revealing');
    });

    setTimeout(() => {
      currentLayer.remove();
      nextLayer.classList.remove('revealing');
      nextLayer.classList.add('visible');
      currentLayer = nextLayer;
      current = next;
    }, 1500);
  }, interval);
}

document.querySelectorAll('.aspect-box').forEach(box => {
  const urls = box.dataset.variants.split(',').map(s => s.trim());
  const cellId = box.dataset.cell || 0;
  if (urls.length) cycleVariants(box, urls, cellId);
});