// import {
//   Entity,
//   PrimaryGeneratedColumn,
//   Column,
//   CreateDateColumn,
//   ManyToOne,
//   JoinColumn,
// } from 'typeorm';

// import { Room } from '../rooms/room.entity';

// @Entity('messages')
// export class Message {
//   @PrimaryGeneratedColumn()
//   id!: number;

//   @Column()
//   nickname!: string;

//   @Column('text')
//   message!: string;

//   @ManyToOne(() => Room, (room) => room.messages, {
//     onDelete: 'CASCADE',
//   })
//   @JoinColumn({
//     name: 'roomId',
//   })
//   room!: Room;

//   @Column()
//   roomId!: number;

//   @CreateDateColumn()
//   createdAt!: Date;
// }

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

  @Column({
    type: 'text',
  })
  message!: string;

  @ManyToOne(
    () => Room,
    (room) => room.messages,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({
    name: 'roomId',
  })
  room!: Room;

  @Column()
  roomId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  // Reply support
  @Column({
    type: 'jsonb',
    nullable: true,
  })
  replyTo!:
    | {
        id?: number;
        nickname: string;
        message: string;
      }
    | null;

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
}
