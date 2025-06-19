export enum OfferStatus {
  PENDING = 'pending',      // Enviada, esperando respuesta del worker
  ACCEPTED = 'accepted',    // Worker aceptó la oferta
  REJECTED = 'rejected',    // Worker rechazó la oferta
  EXPIRED = 'expired',      // Timeout sin respuesta
  COMPLETED = 'completed',  // Trabajo terminado exitosamente
  CANCELLED = 'cancelled',  // Cancelada por el cliente o admin
}
