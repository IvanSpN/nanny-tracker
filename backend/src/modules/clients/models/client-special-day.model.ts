import {
  AllowNull,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { Client } from './client.model';

@Table({
  tableName: 'client_special_days',
  timestamps: true,
  underscored: true,
})
export class ClientSpecialDay extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.UUID,
  })
  declare id: string;

  @ForeignKey(() => Client)
  @AllowNull(false)
  @Column({
    type: DataType.UUID,
    field: 'client_id',
  })
  declare clientId: string;

  @BelongsTo(() => Client, {
    foreignKey: 'clientId',
    as: 'client',
  })
  declare client: Client;

  /** День недели по ISO: 1 — понедельник, 7 — воскресенье. */
  @AllowNull(false)
  @Column({
    type: DataType.SMALLINT,
  })
  declare weekday: number;

  @AllowNull(false)
  @Column({
    type: DataType.DECIMAL(12, 2),
  })
  declare rate: string;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    field: 'created_at',
  })
  declare createdAt: Date;

  @UpdatedAt
  @Column({
    type: DataType.DATE,
    field: 'updated_at',
  })
  declare updatedAt: Date;
}
