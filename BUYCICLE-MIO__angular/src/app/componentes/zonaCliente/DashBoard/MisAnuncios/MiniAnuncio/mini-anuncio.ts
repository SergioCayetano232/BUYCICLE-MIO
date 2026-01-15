import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { IAnuncio } from '../../../../../modelos/interfaces_ORM/ICliente';

@Component({
  selector: 'app-mini-anuncio',
  imports: [DatePipe],
  templateUrl: './mini-anuncio.html',
  styleUrl: './mini-anuncio.css',
})
export class MiniAnuncio {
  anuncio = input.required<IAnuncio>();
  imagenPrincipal = computed(() => this.anuncio().imagenes?.[0] ?? '/images/previsualizador_imagenes_anuncio_placeholder.png');
  tituloCorto = computed(() => {
    const datos = this.anuncio();
    return `${datos.marca} ${datos.modelo} (${datos.anioModelo})`;
  });
}
