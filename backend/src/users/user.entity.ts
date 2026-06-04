import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Room } from '../rooms/room.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    length: 50,
  })
  nickname!: string;

  @Column({
    default: false,
  })
  isOnline!: boolean;

  @Column({
    nullable: true,
    type: 'timestamptz',
  })
  lastSeen!: Date| null;

  @ManyToOne(() => Room, (room) => room.users, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'roomId',
  })
  room!: Room;

  @Column()
  roomId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}