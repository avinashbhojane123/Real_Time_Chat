import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { Room } from '../rooms/room.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'varchar',
    length: 50,
  })
  nickname!: string;

  @Column({
    type: 'text',
  })
  message!: string;

  @ManyToOne(() => Room, (room) => room.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'roomId',
  })
  room!: Room;

  @Index()
  @Column({
    type: 'int',
  })
  roomId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  // Reply support
  @Column({
    type: 'simple-json',
    nullable: true,
  })
  replyTo!: {
    id?: number | string;
    nickname: string;
    message: string;
  } | null;

  // File support
  @Column({
    type: 'text',
    nullable: true,
  })
  fileUrl!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  fileName!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  fileType!: string | null;

  @Column({
    type: 'bigint',
    nullable: true,
  })
  fileSize!: number | null;

  @Column({
    type: 'boolean',
    default: false,
  })
  isEdited!: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  isDeleted!: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  isVoiceNote!: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  isVideoNote!: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  isWithoutSound!: boolean;

  @Column({
    type: 'simple-json',
    nullable: true,
    default: null,
  })
  reactions!: Record<string, string[]> | null;

  @Index()
  @Column({
    type: 'timestamp',
    nullable: true,
    default: null,
  })
  expiresAt!: Date | null;

  @Column({
    type: 'simple-json',
    nullable: true,
    default: null,
  })
  pollData!: {
    question: string;
    options: Array<{ id: number; text: string; votes: string[] }>;
  } | null;

  @Column({
    type: 'simple-json',
    nullable: true,
    default: null,
  })
  locationData!: {
    lat: number;
    lng: number;
  } | null;

  @Column({
    type: 'simple-json',
    nullable: true,
    default: null,
  })
  readBy!: string[] | null;

  @Index()
  @Column({
    type: 'boolean',
    default: false,
  })
  isDirect!: boolean;

  @Index()
  @Column({
    type: 'text',
    nullable: true,
    default: null,
  })
  targetNickname!: string | null;
}
