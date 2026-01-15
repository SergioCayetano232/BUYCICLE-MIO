import { Component, computed, inject, signal } from '@angular/core';
import { StorageGlobal } from '../../../../servicios/storage-global';
import { RouterLink } from '@angular/router';
import { MiniAnuncio } from "./MiniAnuncio/mini-anuncio";
import { IAnuncio } from '../../../../modelos/interfaces_ORM/ICliente';

@Component({
  selector: 'app-mis-anuncios',
  imports: [RouterLink, MiniAnuncio],
  templateUrl: './mis-anuncios.html',
  styleUrl: './mis-anuncios.css',
})
export class MisAnuncios {
  private storageGlobal = inject(StorageGlobal);
  clienteSignal = this.storageGlobal.GetDatosCliente();

  tabs = [
    { label: 'Todos', estado: 'Todos' },
    { label: 'Activo', estado: 'Activo' },
    { label: 'Borradores', estado: 'Borrador' },
    { label: 'En revisión', estado: 'En revision' },
    { label: 'Inactivo', estado: 'Inactivo' },
    { label: 'Vendido', estado: 'Vendido' },
  ];

  estadoSeleccionado = signal<string>('Todos');
  busqueda = signal<string>('');

  anuncios = computed<IAnuncio[]>(() => this.clienteSignal()?.misAnuncios ?? []);

  anunciosFiltrados = computed<IAnuncio[]>(() => {
    const estado = this.estadoSeleccionado();
    const texto = this.busqueda().trim().toLowerCase();
    return this.anuncios()
      .filter((anuncio) => estado === 'Todos' || anuncio.estadoAnuncio === estado)
      .filter((anuncio) => {
        if (!texto) return true;
        const haystack = `${anuncio.marca} ${anuncio.modelo} ${anuncio.titulo}`.toLowerCase();
        return haystack.includes(texto);
      });
  });
}
