/* Panel de capas del mapa (parte de viewMap, línea 4829 del original). */
import type { MapUi } from '@/lib/domain/geo';

export function MapLayers({ M, onColor, onZones, onBase }: { M: MapUi; onColor: (c: MapUi['color']) => void; onZones: () => void; onBase: () => void }) {
  return (
    <div className="mp-lay glass" role="group" aria-label="Capas del mapa">
      <div className="mp-lr">
        <span>Recorridos</span>
        <div className="mp-seg2">
          <button data-a="mapcolor" data-v="one" aria-pressed={M.color !== 'type'} onClick={() => onColor('one')}>
            Un color
          </button>
          <button data-a="mapcolor" data-v="type" aria-pressed={M.color === 'type'} onClick={() => onColor('type')}>
            Por tipo
          </button>
        </div>
      </div>
      <button className="mp-tg" data-a="mapzones" aria-pressed={!!M.zones} onClick={onZones}>
        <span>
          Zonas pintadas<small>Cuadrículas de 200 m, más fuertes cuanto más pasás</small>
        </span>
        <i />
      </button>
      <button className="mp-tg" data-a="mapbase" aria-pressed={M.base} onClick={onBase}>
        <span>
          Mapa de fondo<small>Calles, parques y barrios</small>
        </span>
        <i />
      </button>
    </div>
  );
}
