import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { Room } from '../rooms/room.entity';

@Index(['roomId', 'nickname'])
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'varchar',
    length: 50,
  })
  nickname!: string;

  @Column({
    default: false,
  })
  isOnline!: boolean;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  lastSeen!: Date | null;

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

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  deviceType!: string | null;

  @Column({
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  deviceModel!: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  browser!: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  os!: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  avatarUrl!: string | null;
}
