import { Component, computed, effect, inject, Injector, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, AsyncValidatorFn } from '@angular/forms';
import { delay, of } from 'rxjs';
import { DragDropFilesDirective } from '../../../../../directivas/drag-drop-files.directive';
import { IAnuncio } from '../../../../../modelos/interfaces_ORM/ICliente';
import { StorageGlobal } from '../../../../../servicios/storage-global';
import { FetchNode } from '../../../../../servicios/fetch-node';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-anuncio-bici',
  imports: [ReactiveFormsModule, DragDropFilesDirective, DecimalPipe, DatePipe],
  templateUrl: './crear-anuncio-bici.html',
  styleUrl: './crear-anuncio-bici.css',
})
export class CrearAnuncioBici {
  private storageGlobal = inject(StorageGlobal);
  private fetchNode = inject(FetchNode);
  private injector = inject(Injector);

  tallas: string[] = Array.from({length:20},( _,pos)=>(pos + 42).toString()).concat(['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL','XXXL']);
  clienteSignal = this.storageGlobal.GetDatosCliente();

  imagenes = signal<string[]>([]);
  imagenesError = signal<string>('');
  thumbStart = signal<number>(0);

  form!: FormGroup;

  preview = signal<Partial<IAnuncio>>({});

  thumbsVisibles = computed(() => {
    const inicio = this.thumbStart();
    return this.imagenes().slice(inicio, inicio + 3);
  });

  ganancia = computed(() => {
    const precio = Number(this.form.get('precioVenta')?.value || 0);
    return Math.max(precio - precio * 0.075, 0);
  });

  constructor() {
    this.form = new FormGroup({
      pathCategoria: new FormControl('', [Validators.required]),
      marca: new FormControl('', [Validators.required, Validators.maxLength(50)]),
      modelo: new FormControl(
        '',
        [Validators.required, Validators.maxLength(80)],
        [this.modeloDuplicadoValidator()]
      ),
      talla: new FormControl('', [Validators.required]),
      color: new FormControl('', [Validators.required]),
      anioModelo: new FormControl('', [Validators.required, Validators.pattern('^(19|20)\\d{2}$')]),
      fechaCompra: new FormControl('', [Validators.required]),
      materialCuadro: new FormControl('', [Validators.required, Validators.maxLength(50)]),
      tipoCambio: new FormControl('', [Validators.required]),
      grupoCambio: new FormControl('', [Validators.required, Validators.maxLength(80)]),
      tipoFreno: new FormControl('', [Validators.required]),
      modeloFrenos: new FormControl('', [Validators.required, Validators.maxLength(80)]),
      tipoRuedas: new FormControl('', [Validators.required]),
      modeloRuedas: new FormControl('', [Validators.required, Validators.maxLength(80)]),
      precioOriginal: new FormControl('', [Validators.pattern('^\\d+(\\.\\d{1,2})?$')]),
      tieneFactura: new FormControl(false),
      condicion: new FormControl('Muy bueno', [Validators.required]),
      detallesAdicionales: new FormControl('', [Validators.required, Validators.maxLength(1000)]),
      precioVenta: new FormControl('', [Validators.required, Validators.pattern('^\\d+(\\.\\d{1,2})?$')]),
    });
    this.form.valueChanges.subscribe((value) => {
      this.preview.set(value as Partial<IAnuncio>);
    });
    this.form.get('marca')?.valueChanges.subscribe(() => {
      this.form.get('modelo')?.updateValueAndValidity();
    });
  }

  private modeloDuplicadoValidator(): AsyncValidatorFn {
    return (control: AbstractControl) => {
      const marca = (this.form.get('marca')?.value || '').toString().trim().toLowerCase();
      const modelo = (control.value || '').toString().trim().toLowerCase();
      if (!marca || !modelo) {
        return of(null);
      }
      const existe = (this.clienteSignal()?.misAnuncios || []).some(
        (anuncio) => anuncio.marca.toLowerCase() === marca && anuncio.modelo.toLowerCase() === modelo
      );
      return of(existe ? { modeloDuplicado: true } : null).pipe(delay(200));
    };
  }

  onFilesDropped(files: FileList): void {
    void this.addFiles(files);
  }

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      void this.addFiles(input.files);
      input.value = '';
    }
  }

  private async addFiles(files: FileList): Promise<void> {
    this.imagenesError.set('');
    const actuales = this.imagenes().length;
    const disponibles = 10 - actuales;
    if (disponibles <= 0) {
      this.imagenesError.set('Has alcanzado el máximo de 10 imágenes.');
      return;
    }
    const seleccionados = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, disponibles);
    for (const file of seleccionados) {
      try {
        const reducido = await this.procesarImagen(file);
        const siguiente = [...this.imagenes(), reducido];
        if (this.totalBytes(siguiente) > 12 * 1024 * 1024) {
          this.imagenesError.set('Las imágenes pesan demasiado. Reduce tamaño o cantidad.');
          break;
        }
        this.imagenes.set(siguiente);
      } catch (error) {
        this.imagenesError.set('No se pudo procesar una imagen.');
      }
    }
  }

  private procesarImagen(file: File): Promise<string> {
    const maxSize = 1280;
    const quality = 0.75;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('reader'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('image'));
        img.onload = () => {
          const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * ratio);
          canvas.height = Math.round(img.height * ratio);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('canvas'));
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  private totalBytes(imagenes: string[]): number {
    return imagenes.reduce((total, dataUrl) => {
      const base64 = dataUrl.split(',')[1] || '';
      return total + Math.floor((base64.length * 3) / 4);
    }, 0);
  }
  prevThumbs(): void {
    const actual = this.thumbStart();
    this.thumbStart.set(Math.max(actual - 3, 0));
  }

  nextThumbs(): void {
    const actual = this.thumbStart();
    if (actual + 3 < this.imagenes().length) {
      this.thumbStart.set(actual + 3);
    }
  }

  guardarAnuncio(estado: 'En revision' | 'Borrador'): void {
    this.imagenesError.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      Swal.fire({
        title: 'Revisa el formulario',
        text: 'Hay campos obligatorios o con formato incorrecto.',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
      });
      return;
    }
    if (this.imagenes().length < 3) {
      this.imagenesError.set('Debes subir al menos 3 imágenes.');
      return;
    }
    const cliente = this.clienteSignal();
    if (!cliente?._id) {
      Swal.fire({
        title: 'Sesión no válida',
        text: 'No se pudo identificar el cliente.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
      });
      return;
    }

    const valores = this.form.getRawValue();
    const anuncio: IAnuncio = {
      pathCategoria: valores.pathCategoria || '',
      titulo: `${valores.marca} ${valores.modelo}`,
      marca: valores.marca || '',
      modelo: valores.modelo || '',
      talla: valores.talla || '',
      color: valores.color || '',
      anioModelo: valores.anioModelo || '',
      fechaCompra: valores.fechaCompra ? new Date(valores.fechaCompra).getTime() : 0,
      materialCuadro: valores.materialCuadro || '',
      grupoCambio: valores.grupoCambio || '',
      tipoFreno: valores.tipoFreno || '',
      modeloFrenos: valores.modeloFrenos || '',
      tipoRuedas: valores.tipoRuedas || '',
      modeloRuedas: valores.modeloRuedas || '',
      precioOriginal: valores.precioOriginal ? Number(valores.precioOriginal) : 0,
      precioVenta: Number(valores.precioVenta || 0),
      tieneFactura: Boolean(valores.tieneFactura),
      condicion: valores.condicion || '',
      detallesAdicionales: valores.detallesAdicionales || '',
      imagenes: this.imagenes(),
      estadoAnuncio: estado,
    };

    const petCrear = this.fetchNode.CrearAnuncioCliente({
      idCliente: cliente._id,
      anuncio,
    });

    const onResponse = () => {
      const respuesta = petCrear();
      if (respuesta.codigo === 100) return;
      if (respuesta.codigo !== 0) {
        Swal.fire({
          title: 'Error al guardar el anuncio',
          text: respuesta.mensaje,
          icon: 'error',
          confirmButtonText: 'Aceptar',
        });
        return;
      }
      this.storageGlobal.SetDatosCliente(respuesta.datos.cliente);
      Swal.fire({
        title: 'Anuncio guardado',
        text: respuesta.mensaje,
        icon: 'success',
        confirmButtonText: 'Aceptar',
      });
    };
    effect(onResponse, { injector: this.injector });
  }
}
