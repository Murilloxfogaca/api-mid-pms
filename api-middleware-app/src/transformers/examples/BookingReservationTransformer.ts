/**
 * Example Transformer: Booking Engine Reservation
 *
 * Transforms reservation data from internal format to booking engine format
 */

import { BaseTransformer } from '../baseTransformer';

interface InternalReservation {
    reservationId: string;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    checkInDate: string;
    checkOutDate: string;
    roomType: string;
    numberOfGuests: number;
    totalAmount: number;
    currency: string;
    status: 'pending' | 'confirmed' | 'cancelled';
    specialRequests?: string;
}

interface BookingEngineReservation {
    reservation_id: string;
    guest: {
        name: string;
        email: string;
        phone: string;
    };
    stay: {
        check_in: string;
        check_out: string;
        room_type: string;
        guests: number;
    };
    payment: {
        total: number;
        currency: string;
    };
    status: string;
    notes?: string;
}

export class BookingReservationTransformer extends BaseTransformer<InternalReservation, BookingEngineReservation> {
    constructor() {
        super('BookingReservationTransformer');
    }

    transform(input: InternalReservation): BookingEngineReservation {
        return {
            reservation_id: input.reservationId,
            guest: {
                name: input.guestName,
                email: input.guestEmail,
                phone: this.cleanPhone(input.guestPhone)
            },
            stay: {
                check_in: this.formatDate(input.checkInDate),
                check_out: this.formatDate(input.checkOutDate),
                room_type: input.roomType,
                guests: input.numberOfGuests
            },
            payment: {
                total: input.totalAmount,
                currency: input.currency
            },
            status: input.status,
            notes: input.specialRequests
        };
    }

    /**
     * Reverse transformation from booking engine format to internal format
     */
    reverseTransform(output: BookingEngineReservation): InternalReservation {
        return {
            reservationId: output.reservation_id,
            guestName: output.guest.name,
            guestEmail: output.guest.email,
            guestPhone: output.guest.phone,
            checkInDate: output.stay.check_in,
            checkOutDate: output.stay.check_out,
            roomType: output.stay.room_type,
            numberOfGuests: output.stay.guests,
            totalAmount: output.payment.total,
            currency: output.payment.currency,
            status: output.status as any,
            specialRequests: output.notes
        };
    }

    validate(input: InternalReservation): boolean {
        if (!super.validate(input)) return false;

        // Required fields validation
        const required = [
            'reservationId',
            'guestName',
            'guestEmail',
            'checkInDate',
            'checkOutDate',
            'roomType',
            'numberOfGuests',
            'totalAmount'
        ];

        for (const field of required) {
            if (!input[field as keyof InternalReservation]) {
                throw new Error(`Required field missing: ${field}`);
            }
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.guestEmail)) {
            throw new Error('Invalid email format');
        }

        // Date validation
        const checkIn = this.parseDate(input.checkInDate);
        const checkOut = this.parseDate(input.checkOutDate);

        if (!checkIn || !checkOut) {
            throw new Error('Invalid date format');
        }

        if (checkOut <= checkIn) {
            throw new Error('Check-out date must be after check-in date');
        }

        return true;
    }
}
