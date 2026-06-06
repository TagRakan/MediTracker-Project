package com.MTA.V01.models;

import com.MTA.V01.models.enumerationClasses.AilmentStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

//TODO add data safety

@Entity
@Table(name = "ailment")
@Setter
@Getter
@NoArgsConstructor
public class Ailment {
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Id
    private Long id;

    @NotBlank
    private String ailmentName;

    @ManyToOne
    @JoinColumn(name = "ailment_status_id", referencedColumnName = "id")
    private AilmentStatus ailmentStatus;

    @ManyToOne
    @JoinColumn(name = "ailment_type_id", referencedColumnName = "id")
    private AilmentType ailmentType;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    public Ailment(String ailmentName, AilmentStatus ailmentStatus, AilmentType ailmentType) {
        this.ailmentName = ailmentName;
        this.ailmentStatus = ailmentStatus;
        this.ailmentType = ailmentType;
    }
}
