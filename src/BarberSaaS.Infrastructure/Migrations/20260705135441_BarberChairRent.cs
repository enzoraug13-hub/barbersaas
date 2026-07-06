using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarberSaaS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class BarberChairRent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ChairRentAmount",
                table: "Barbers",
                type: "numeric(10,2)",
                nullable: true);

            migrationBuilder.AddColumn<byte>(
                name: "ChairRentPeriod",
                table: "Barbers",
                type: "smallint",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ChairRentAmount",
                table: "Barbers");

            migrationBuilder.DropColumn(
                name: "ChairRentPeriod",
                table: "Barbers");
        }
    }
}
