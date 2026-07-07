import {
  AllowNull,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  DeletedAt,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt,
} from 'sequelize-typescript';
import { User } from '../../users/models/user.model';

@Table({
  tableName: 'workers',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export class Worker extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.UUID,
  })
  declare id: string;

  @ForeignKey(() => User)
  @Unique
  @AllowNull(false)
  @Column({
    type: DataType.UUID,
    field: 'user_id',
  })
  declare userId: string;

  @BelongsTo(() => User, {
    foreignKey: 'userId',
    as: 'user',
  })
  declare user: User;

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
  })
  declare name: string;

  @AllowNull(true)
  @Column({
    type: DataType.STRING,
  })
  declare phone: string | null;

  @AllowNull(true)
  @Column({
    type: DataType.DECIMAL(12, 2),
    field: 'default_regular_rate',
  })
  declare defaultRegularRate: string | null;

  @AllowNull(true)
  @Column({
    type: DataType.DECIMAL(12, 2),
    field: 'default_weekend_rate',
  })
  declare defaultWeekendRate: string | null;

  @AllowNull(false)
  @Default(true)
  @Column({
    type: DataType.BOOLEAN,
    field: 'is_active',
  })
  declare isActive: boolean;

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

  @DeletedAt
  @Column({
    type: DataType.DATE,
    field: 'deleted_at',
  })
  declare deletedAt: Date | null;
}

export default Worker;
