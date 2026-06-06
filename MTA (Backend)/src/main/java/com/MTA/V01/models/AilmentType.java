package com.MTA.V01.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

//TODO add data safety

@Entity
@Table(name = "ailment_type")
@Setter
@Getter
@NoArgsConstructor
public class AilmentType {
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Id
    private Long id;

    @NotBlank
    private String name;

    @Column(length = 1000)
    private String ailmentDescription;

    private Boolean isCustom;

    private Boolean isProtected;

    private Boolean isPhysical;

    public AilmentType(String name, String ailmentDescription, Boolean isProtected, Boolean isPhysical) {
        this.name = name;
        this.ailmentDescription = ailmentDescription;
        this.isProtected = isProtected;
        this.isPhysical = isPhysical;
    }

    @JsonIgnore
    @OneToMany(mappedBy = "ailmentType",cascade = CascadeType.ALL,orphanRemoval = true)
    private List<Ailment> ailment;

    @JsonIgnore
    @ManyToOne
    private User user;

    @Override
    public String toString() {
        return "AilmentType{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", ailmentDescription='" + ailmentDescription + '\'' +
                ", isCustom=" + isCustom +
                ", isProtected=" + isProtected +
                ", isPhysical=" + isPhysical +
                '}';
    }
}
