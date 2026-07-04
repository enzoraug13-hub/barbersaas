using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarberSaaS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class BarberGoogleCredentials : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BarberGoogleCredentials",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BarberId = table.Column<Guid>(type: "uuid", nullable: false),
                    GoogleEmail = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true),
                    AccessToken = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    RefreshToken = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    AccessTokenExpiresAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    ConnectedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BarberGoogleCredentials", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BarberGoogleCredentials_Barbers_BarberId",
                        column: x => x.BarberId,
                        principalTable: "Barbers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BarberGoogleCredentials_BarberId",
                table: "BarberGoogleCredentials",
                column: "BarberId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BarberGoogleCredentials");
        }
    }
}
