import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Room } from '../rooms/room.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  nickname!: string;

  @Column('text')
  message!: string;

  @ManyToOne(() => Room, (room) => room.messages, {
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
}